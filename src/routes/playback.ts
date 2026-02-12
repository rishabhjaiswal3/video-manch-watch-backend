import { Router, Request, Response } from 'express';
import { VideoAnalytics, ActiveSession, IPlaybackEvent } from '../models/VideoAnalytics.js';
import { Video } from '../models/Video.js';
import { getNumericEnv } from '../config/env.js';
import { generateSignedUrl, verifySignedUrl } from '../utils/signedUrl.js';
import { r2Service } from '../services/r2Service.js';
import { R2_BUCKETS } from '../config/r2.js';

const router = Router();

// Token expiry time (1 hour by default, configurable)
const TOKEN_EXPIRY_SECONDS = getNumericEnv('VIDEO_TOKEN_EXPIRY_SECONDS', 3600);
const SEGMENT_BASE_URL = process.env.VIDEO_SEGMENT_BASE_URL || 'https://video-segment.videomanch.com';

const normalizePath = (input: string) => {
    if (!input) return '';
    try {
        if (input.startsWith('http://') || input.startsWith('https://')) {
            const parsed = new URL(input);
            return parsed.pathname.replace(/^\//, '');
        }
    } catch {
        // fall through
    }
    return input.replace(/^\//, '');
};

// ==========================================
// ANALYTICS CONFIGURATION (from .env)
// ==========================================
const FLUSH_INTERVAL_MS = getNumericEnv('ANALYTICS_FLUSH_INTERVAL_MS', 60000);
const FLUSH_CHECK_MS = getNumericEnv('ANALYTICS_FLUSH_CHECK_MS', 10000);
const MAX_LIVE_VIDEOS = getNumericEnv('ANALYTICS_MAX_LIVE_VIDEOS', 20);
const DEFAULT_ANALYTICS_DAYS = getNumericEnv('ANALYTICS_DEFAULT_DAYS', 7);

// In-memory buffer for batch processing (reduces DB writes)
interface EventBuffer {
    [videoId: string]: {
        plays: number;
        pauses: number;
        seeks: number;
        buffers: number;
        errors: number;
        watchTime: number;
        completionRates: number[];
        qualities: Record<string, number>;
        sessions: Set<string>;
    };
}

let eventBuffer: EventBuffer = {};
let lastFlush = Date.now();

/**
 * Flush buffered events to MongoDB
 */
async function flushBuffer(): Promise<void> {
    if (Object.keys(eventBuffer).length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const bufferCopy = eventBuffer;
    eventBuffer = {};

    console.log('[PLAYBACK-ANALYTICS] 📊 Flushing', Object.keys(bufferCopy).length, 'video stats to DB');

    for (const [videoId, stats] of Object.entries(bufferCopy)) {
        try {
            const avgCompletionRate = stats.completionRates.length > 0
                ? stats.completionRates.reduce((a, b) => a + b, 0) / stats.completionRates.length
                : 0;

            await VideoAnalytics.findOneAndUpdate(
                { videoId, date: today },
                {
                    $inc: {
                        views: stats.sessions.size,
                        totalPlays: stats.plays,
                        totalPauses: stats.pauses,
                        totalSeeks: stats.seeks,
                        bufferingEvents: stats.buffers,
                        errorCount: stats.errors,
                        totalWatchTime: stats.watchTime,
                        'qualityStats.1080p': stats.qualities['1080p'] || 0,
                        'qualityStats.720p': stats.qualities['720p'] || 0,
                        'qualityStats.480p': stats.qualities['480p'] || 0,
                        'qualityStats.360p': stats.qualities['360p'] || 0,
                        'qualityStats.auto': stats.qualities['auto'] || 0,
                    },
                    $addToSet: {
                        sessions: { $each: Array.from(stats.sessions) },
                    },
                    $set: {
                        avgCompletionRate: avgCompletionRate,
                        avgWatchTime: stats.sessions.size > 0 ? stats.watchTime / stats.sessions.size : 0,
                    },
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('[PLAYBACK-ANALYTICS] ❌ Failed to flush stats for video:', videoId, error);
        }
    }

    console.log('[PLAYBACK-ANALYTICS] ✅ Buffer flushed successfully');
}

// Start periodic flush using configurable intervals
setInterval(() => {
    if (Date.now() - lastFlush >= FLUSH_INTERVAL_MS) {
        flushBuffer();
        lastFlush = Date.now();
    }
}, FLUSH_CHECK_MS);

/**
 * Process a single playback event
 */
function processEvent(event: IPlaybackEvent): void {
    const { videoId, sessionId, type, data } = event;

    // Initialize buffer for this video if needed
    if (!eventBuffer[videoId]) {
        eventBuffer[videoId] = {
            plays: 0,
            pauses: 0,
            seeks: 0,
            buffers: 0,
            errors: 0,
            watchTime: 0,
            completionRates: [],
            qualities: {},
            sessions: new Set(),
        };
    }

    const stats = eventBuffer[videoId];
    stats.sessions.add(sessionId);

    switch (type) {
        case 'play':
            stats.plays++;
            break;
        case 'pause':
            stats.pauses++;
            if (data.watchTime) {
                stats.watchTime += data.watchTime;
            }
            break;
        case 'seek':
            stats.seeks++;
            break;
        case 'buffer':
            stats.buffers++;
            break;
        case 'error':
            stats.errors++;
            break;
        case 'quality_change':
            if (data.quality) {
                stats.qualities[data.quality] = (stats.qualities[data.quality] || 0) + 1;
            }
            break;
        case 'ended':
            if (data.completionRate) {
                stats.completionRates.push(data.completionRate);
            }
            if (data.watchTime) {
                stats.watchTime += data.watchTime;
            }
            break;
        case 'heartbeat':
            if (data.quality) {
                stats.qualities[data.quality] = (stats.qualities[data.quality] || 0) + 1;
            }
            break;
    }
}

/**
 * POST /api/playback/events
 * Receive batch of playback events from player
 * 
 * Lightweight - just buffers in memory, flushes periodically
 */
router.post('/events', async (req: Request, res: Response) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ success: false, error: 'events array required' });
        }

        // Process events in memory (very fast)
        for (const event of events) {
            if (event.videoId && event.sessionId && event.type) {
                processEvent(event as IPlaybackEvent);

                // Update active session for heartbeats
                if (event.type === 'heartbeat' || event.type === 'play') {
                    ActiveSession.findOneAndUpdate(
                        { sessionId: event.sessionId },
                        {
                            $set: {
                                videoId: event.videoId,
                                userId: event.userId,
                                quality: event.data?.quality || 'auto',
                                watchTime: event.data?.watchTime || 0,
                                currentTime: event.data?.currentTime || 0,
                                lastHeartbeat: new Date(),
                            },
                            $setOnInsert: {
                                startedAt: new Date(),
                            },
                        },
                        { upsert: true }
                    ).exec().catch(err => {
                        // Fire and forget - don't block response
                        console.error('[PLAYBACK-ANALYTICS] Session update failed:', err.message);
                    });
                }

                // Remove session on ended/pause
                if (event.type === 'ended') {
                    ActiveSession.deleteOne({ sessionId: event.sessionId }).exec().catch(() => { });
                }
            }
        }

        // Return immediately (non-blocking)
        res.status(200).json({ success: true, received: events.length });
    } catch (error: any) {
        console.error('[PLAYBACK-ANALYTICS] ❌ Error processing events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/stats/:videoId
 * Get analytics for a specific video
 */
router.get('/stats/:videoId', async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { days = DEFAULT_ANALYTICS_DAYS } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateStr = startDate.toISOString().split('T')[0];

        const stats = await VideoAnalytics.find({
            videoId,
            date: { $gte: startDateStr },
        }).sort({ date: -1 });

        // Get current concurrent viewers
        const concurrent = await ActiveSession.countDocuments({ videoId });

        // Aggregate totals
        const totals = stats.reduce(
            (acc, day) => ({
                views: acc.views + day.views,
                totalWatchTime: acc.totalWatchTime + day.totalWatchTime,
                plays: acc.plays + day.totalPlays,
                completions: acc.completions + day.completions,
            }),
            { views: 0, totalWatchTime: 0, plays: 0, completions: 0 }
        );

        res.json({
            success: true,
            data: {
                videoId,
                currentConcurrent: concurrent,
                period: { days: Number(days), start: startDateStr },
                totals: {
                    ...totals,
                    avgWatchTime: totals.views > 0 ? totals.totalWatchTime / totals.views : 0,
                    completionRate: totals.plays > 0 ? (totals.completions / totals.plays) * 100 : 0,
                },
                daily: stats.map(day => ({
                    date: day.date,
                    views: day.views,
                    watchTime: day.totalWatchTime,
                    avgWatchTime: day.avgWatchTime,
                    completionRate: day.avgCompletionRate,
                    qualityStats: day.qualityStats,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK-ANALYTICS] ❌ Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/concurrent/:videoId
 * Get current concurrent viewers for a video
 */
router.get('/concurrent/:videoId', async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;

        const concurrent = await ActiveSession.countDocuments({ videoId });
        const sessions = await ActiveSession.find({ videoId }).select('-_id -__v');

        res.json({
            success: true,
            data: {
                videoId,
                concurrent,
                sessions: sessions.map(s => ({
                    quality: s.quality,
                    watchTime: s.watchTime,
                    currentTime: s.currentTime,
                    startedAt: s.startedAt,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK-ANALYTICS] ❌ Error fetching concurrent:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/live
 * Get all active viewing sessions across all videos
 */
router.get('/live', async (req: Request, res: Response) => {
    try {
        const sessions = await ActiveSession.aggregate([
            {
                $group: {
                    _id: '$videoId',
                    viewers: { $sum: 1 },
                    avgWatchTime: { $avg: '$watchTime' },
                    qualities: { $push: '$quality' },
                },
            },
            { $sort: { viewers: -1 } },
            { $limit: MAX_LIVE_VIDEOS },
        ]);

        const totalViewers = await ActiveSession.countDocuments();

        res.json({
            success: true,
            data: {
                totalActiveViewers: totalViewers,
                videos: sessions.map(v => ({
                    videoId: v._id,
                    viewers: v.viewers,
                    avgWatchTime: Math.round(v.avgWatchTime || 0),
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK-ANALYTICS] ❌ Error fetching live stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/overview
 * Get platform-wide playback analytics
 */
router.get('/overview', async (req: Request, res: Response) => {
    try {
        const { days = DEFAULT_ANALYTICS_DAYS } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateStr = startDate.toISOString().split('T')[0];

        const stats = await VideoAnalytics.aggregate([
            { $match: { date: { $gte: startDateStr } } },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: '$views' },
                    totalWatchTime: { $sum: '$totalWatchTime' },
                    totalPlays: { $sum: '$totalPlays' },
                    totalPauses: { $sum: '$totalPauses' },
                    totalSeeks: { $sum: '$totalSeeks' },
                    totalBuffers: { $sum: '$bufferingEvents' },
                    totalErrorCount: { $sum: '$errorCount' },
                    avgCompletionRate: { $avg: '$avgCompletionRate' },
                    uniqueVideos: { $addToSet: '$videoId' },
                },
            },
        ]);

        const result = stats[0] || {
            totalViews: 0,
            totalWatchTime: 0,
            totalPlays: 0,
            totalPauses: 0,
            totalSeeks: 0,
            totalBuffers: 0,
            totalErrorCount: 0,
            avgCompletionRate: 0,
            uniqueVideos: [],
        };

        // Get current active viewers
        const activeViewers = await ActiveSession.countDocuments();

        res.json({
            success: true,
            data: {
                period: { days: Number(days), start: startDateStr },
                activeViewers,
                totals: {
                    views: result.totalViews,
                    watchTimeSeconds: result.totalWatchTime,
                    watchTimeFormatted: formatDuration(result.totalWatchTime),
                    plays: result.totalPlays,
                    pauses: result.totalPauses,
                    seeks: result.totalSeeks,
                    buffers: result.totalBuffers,
                    errors: result.totalErrorCount,
                    avgCompletionRate: Math.round(result.avgCompletionRate || 0),
                    uniqueVideosWatched: result.uniqueVideos.length,
                },
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK-ANALYTICS] ❌ Error fetching overview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

function formatDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

/**
 * GET /api/playback/stream/:videoId
 * Get signed streaming URLs for a video
 *
 * Returns signed URLs that expire after TOKEN_EXPIRY_SECONDS
 * These URLs must be validated by Cloudflare Worker
 */
router.get('/stream/:videoId', async (req: Request, res: Response) => {
    console.log('[PLAYBACK] 🎬 Stream request received for videoId:', req.params.videoId);
    try {
        const { videoId } = req.params;

        // Find the video
        console.log('[PLAYBACK] 🔍 Looking up video in database...');
        const video = await Video.findOne({
            videoId,
            status: 'completed',
        }).lean();
        console.log('[PLAYBACK] 📋 Video found:', video ? 'Yes' : 'No');

        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found',
            });
        }

        // Generate signed URL for master playlist
        const masterPlaylistPath = normalizePath(video.masterPlaylistUrl || '');
        if (!masterPlaylistPath) {
            return res.status(404).json({
                success: false,
                error: 'Video has no playlist',
            });
        }

        const signedMaster = generateSignedUrl({
            videoId,
            path: `playback/master/${videoId}`,
            expiresIn: TOKEN_EXPIRY_SECONDS,
        });

        // Generate signed URLs for each quality variant
        const signedOutputs = (video.outputs || []).map(output => {
            if (!output.playlistUrl) return null;

            const signed = generateSignedUrl({
                videoId,
                path: normalizePath(output.playlistUrl),
                expiresIn: TOKEN_EXPIRY_SECONDS,
            });

            return {
                quality: output.quality,
                signedPlaylistUrl: signed.signedPath,
                expires: signed.expires,
            };
        }).filter(Boolean);

        res.json({
            success: true,
            data: {
                videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
                masterPlaylist: {
                    signedUrl: signedMaster.signedPath,
                    expires: signedMaster.expires,
                    expiresIn: TOKEN_EXPIRY_SECONDS,
                },
                outputs: signedOutputs,
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error generating signed URLs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/master/:videoId
 * Returns rewritten master playlist with signed variant URLs
 */
router.get('/master/:videoId', async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const token = req.query.token as string | undefined;
        const expires = req.query.expires as string | undefined;
        const vid = req.query.vid as string | undefined;

        if (!token || !expires || !vid) {
            return res.status(403).send('Forbidden: Token required');
        }

        const isValid = verifySignedUrl(`playback/master/${videoId}`, videoId, token, parseInt(expires, 10));
        if (!isValid) {
            return res.status(403).send('Forbidden: Invalid or expired token');
        }

        const video = await Video.findOne({
            videoId,
            status: 'completed',
        }).lean();

        if (!video || !video.masterPlaylistUrl) {
            return res.status(404).send('Playlist not found');
        }

        const masterKey = normalizePath(video.masterPlaylistUrl);
        const baseDir = masterKey.substring(0, masterKey.lastIndexOf('/') + 1);

        const downloadUrl = await r2Service.getDownloadPresignedUrl(
            R2_BUCKETS.TRANSCODED,
            masterKey,
            60
        );

        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return res.status(502).send('Failed to fetch master playlist');
        }
        const playlistText = await response.text();

        const rewritten = playlistText
            .split(/\r?\n/)
            .map((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;

                let variantKey = trimmed;
                try {
                    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                        const parsed = new URL(trimmed);
                        variantKey = parsed.pathname.replace(/^\//, '');
                    } else {
                        variantKey = normalizePath(`${baseDir}${trimmed}`);
                    }
                } catch {
                    variantKey = normalizePath(`${baseDir}${trimmed}`);
                }

                const signed = generateSignedUrl({
                    videoId,
                    path: variantKey,
                    expiresIn: TOKEN_EXPIRY_SECONDS,
                });

                return `${SEGMENT_BASE_URL}/${signed.signedPath}`;
            })
            .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.status(200).send(rewritten);
    } catch (error) {
        console.error('[PLAYBACK] ❌ Error serving master playlist:', error);
        return res.status(500).send('Internal Server Error');
    }
});

export default router;
