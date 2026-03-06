import { Router, Request, Response } from 'express';
import { VideoAnalytics, ActiveSession, IPlaybackEvent } from '../../../shared/models/VideoAnalytics.js';
import { UserWatchHistory } from '../../../shared/models/UserAnalytics.js';
import { Video } from '../../../shared/models/Video.js';
import { getNumericEnv } from '../../../shared/config/env.js';
import { generateSignedUrl, verifySignedUrl } from '../../../shared/utils/signedUrl.js';
import { r2Service } from '../../../infra/storage/r2Service.js';
import { R2_BUCKETS } from '../../../shared/config/r2.js';
import { authenticate } from '../../../shared/middleware/auth.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';
import {
    pushEventsToRedis,
    processEventsInline,
    updateActiveSession,
    removeActiveSession,
} from '../../../workers/services/analyticsWorker.js';

const router = Router();

// Token expiry time (1 hour by default, configurable)
const TOKEN_EXPIRY_SECONDS = getNumericEnv('VIDEO_TOKEN_EXPIRY_SECONDS', 3600);
const SEGMENT_BASE_URL = process.env.VIDEO_SEGMENT_BASE_URL || 'https://video-segment.videomanch.com';
const DEFAULT_ANALYTICS_DAYS = getNumericEnv('ANALYTICS_DEFAULT_DAYS', 7);

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

function formatDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

const ensureCanAccessUserAnalytics = (req: Request, res: Response): boolean => {
    const authUser = ensureAuthenticatedUser(req);
    const requestedUserId = req.params.userId;
    if (!authUser.roles.includes('admin') && authUser.userId !== requestedUserId) {
        res.status(403).json({ success: false, error: 'Forbidden.' });
        return false;
    }
    return true;
};

// ==========================================
// EVENTS API — Receives player events, pushes to Redis
// ==========================================

/**
 * POST /api/playback/events
 * Receive batch of playback events from player/website
 *
 * Events are pushed to Redis for processing by the analytics worker.
 * Active sessions are updated in real-time (not batched).
 */
router.post('/events', async (req: Request, res: Response) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ success: false, error: 'events array required' });
        }

        // Filter valid events
        const validEvents: IPlaybackEvent[] = [];
        for (const event of events) {
            if (event.videoId && event.sessionId && event.type) {
                validEvents.push(event as IPlaybackEvent);
            }
        }

        if (validEvents.length === 0) {
            return res.status(200).json({ success: true, received: 0 });
        }

        let queuedInRedis = true;
        try {
            // Push to Redis queue (fast — non-blocking)
            const pushed = await pushEventsToRedis(validEvents);
            console.log(`[PLAYBACK] 📥 Pushed ${pushed} events to Redis`);
        } catch (queueError: any) {
            queuedInRedis = false;
            console.warn(`[PLAYBACK] ⚠️ Redis queue unavailable, processing inline: ${queueError?.message || 'unknown error'}`);
            await processEventsInline(validEvents);
        }

        // Update active sessions in real-time (for live viewer counts)
        // These are fire-and-forget — don't block the response
        for (const event of validEvents) {
            if (event.type === 'heartbeat' || event.type === 'play' || event.type === 'watchtime') {
                updateActiveSession(event).catch(() => { });
            }

            if (event.type === 'ended') {
                removeActiveSession(event.sessionId).catch(() => { });
            }
        }

        // Return immediately
        res.status(200).json({
            success: true,
            received: validEvents.length,
            processingMode: queuedInRedis ? 'queued' : 'inline',
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error processing events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ANALYTICS QUERY APIs
// ==========================================

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
        console.error('[PLAYBACK] ❌ Error fetching stats:', error);
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
        console.error('[PLAYBACK] ❌ Error fetching concurrent:', error);
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
            { $limit: 20 },
        ]);

        const totalViewers = await ActiveSession.countDocuments();
        const videoIds = sessions.map((v: any) => v._id).filter(Boolean);
        const historical = videoIds.length > 0
            ? await VideoAnalytics.aggregate([
                { $match: { videoId: { $in: videoIds } } },
                { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
            ])
            : [];
        const historicalMap = new Map(historical.map((row: any) => [row._id, Number(row.totalViews || 0)]));

        res.json({
            success: true,
            data: {
                totalActiveViewers: totalViewers,
                videos: sessions.map(v => ({
                    videoId: v._id,
                    viewers: v.viewers,
                    avgWatchTime: Math.round(v.avgWatchTime || 0),
                    totalViews: historicalMap.get(v._id) || 0,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching live stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/live/mine
 * Get active live sessions for the authenticated creator/admin's videos.
 */
router.get('/live/mine', authenticate, async (req: Request, res: Response) => {
    try {
        const { userId } = ensureAuthenticatedUser(req);
        const creatorVideos = await Video.find({ userId })
            .select('videoId')
            .lean();
        const videoIds = creatorVideos.map((v: any) => v.videoId).filter(Boolean);

        if (videoIds.length === 0) {
            return res.json({
                success: true,
                data: { totalActiveViewers: 0, videos: [] },
            });
        }

        const sessions = await ActiveSession.aggregate([
            { $match: { videoId: { $in: videoIds } } },
            {
                $group: {
                    _id: '$videoId',
                    viewers: { $sum: 1 },
                    avgWatchTime: { $avg: '$watchTime' },
                },
            },
            { $sort: { viewers: -1 } },
            { $limit: 20 },
        ]);

        const historical = await VideoAnalytics.aggregate([
            { $match: { videoId: { $in: videoIds } } },
            { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
        ]);
        const historicalMap = new Map(historical.map((row: any) => [row._id, Number(row.totalViews || 0)]));

        const totalViewers = sessions.reduce((sum, item) => sum + Number(item.viewers || 0), 0);

        return res.json({
            success: true,
            data: {
                totalActiveViewers: totalViewers,
                videos: sessions.map(v => ({
                    videoId: v._id,
                    viewers: v.viewers,
                    avgWatchTime: Math.round(v.avgWatchTime || 0),
                    totalViews: historicalMap.get(v._id) || 0,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching creator live stats:', error);
        return res.status(500).json({ success: false, error: error.message });
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
        console.error('[PLAYBACK] ❌ Error fetching overview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/overview/mine
 * Get playback analytics overview for authenticated creator/admin's videos.
 */
router.get('/overview/mine', authenticate, async (req: Request, res: Response) => {
    try {
        const { userId } = ensureAuthenticatedUser(req);
        const { days = DEFAULT_ANALYTICS_DAYS } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateStr = startDate.toISOString().split('T')[0];

        const creatorVideos = await Video.find({ userId })
            .select('videoId')
            .lean();
        const videoIds = creatorVideos.map((v: any) => v.videoId).filter(Boolean);

        if (videoIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    period: { days: Number(days), start: startDateStr },
                    activeViewers: 0,
                    totals: {
                        views: 0,
                        watchTimeSeconds: 0,
                        watchTimeFormatted: formatDuration(0),
                        plays: 0,
                        pauses: 0,
                        seeks: 0,
                        buffers: 0,
                        errors: 0,
                        avgCompletionRate: 0,
                        uniqueVideosWatched: 0,
                    },
                },
            });
        }

        const [stats, activeViewers] = await Promise.all([
            VideoAnalytics.aggregate([
                {
                    $match: {
                        videoId: { $in: videoIds },
                        date: { $gte: startDateStr },
                    },
                },
                {
                    $group: {
                        _id: null,
                        views: { $sum: '$views' },
                        watchTime: { $sum: '$totalWatchTime' },
                        plays: { $sum: '$totalPlays' },
                        pauses: { $sum: '$totalPauses' },
                        seeks: { $sum: '$totalSeeks' },
                        buffers: { $sum: '$totalBuffers' },
                        errors: { $sum: '$totalErrors' },
                        avgCompletionRate: { $avg: '$avgCompletionRate' },
                        uniqueVideos: { $addToSet: '$videoId' },
                    },
                },
            ]),
            ActiveSession.countDocuments({ videoId: { $in: videoIds } }),
        ]);

        const totals = stats[0] || {};

        return res.json({
            success: true,
            data: {
                period: { days: Number(days), start: startDateStr },
                activeViewers,
                totals: {
                    views: Math.round(totals.views || 0),
                    watchTimeSeconds: Math.round(totals.watchTime || 0),
                    watchTimeFormatted: formatDuration(Math.round(totals.watchTime || 0)),
                    plays: Math.round(totals.plays || 0),
                    pauses: Math.round(totals.pauses || 0),
                    seeks: Math.round(totals.seeks || 0),
                    buffers: Math.round(totals.buffers || 0),
                    errors: Math.round(totals.errors || 0),
                    avgCompletionRate: Number((totals.avgCompletionRate || 0).toFixed(1)),
                    uniqueVideosWatched: Array.isArray(totals.uniqueVideos) ? totals.uniqueVideos.length : 0,
                },
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching creator overview:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// USER WATCH HISTORY APIs
// ==========================================

/**
 * GET /api/playback/user/:userId/history
 * Get a user's watch history (recently watched videos)
 */
router.get('/user/:userId/history', authenticate, async (req: Request, res: Response) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res)) return;
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [history, total] = await Promise.all([
            UserWatchHistory.find({ userId })
                .sort({ lastWatchedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            UserWatchHistory.countDocuments({ userId }),
        ]);

        res.json({
            success: true,
            data: {
                history: history.map(h => ({
                    videoId: h.videoId,
                    totalWatchTime: h.totalWatchTime,
                    lastWatchedPosition: h.lastWatchedPosition,
                    maxWatchedPosition: h.maxWatchedPosition,
                    videoDuration: h.videoDuration,
                    completionRate: h.completionRate,
                    isCompleted: h.isCompleted,
                    totalSessions: h.totalSessions,
                    lastQuality: h.lastQuality,
                    videoType: h.videoType,
                    firstWatchedAt: h.firstWatchedAt,
                    lastWatchedAt: h.lastWatchedAt,
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching user history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/user/:userId/continue
 * Get videos the user started but hasn't finished (for "Continue Watching")
 */
router.get('/user/:userId/continue', authenticate, async (req: Request, res: Response) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res)) return;
        const { userId } = req.params;
        const { limit = 10 } = req.query;

        const continueWatching = await UserWatchHistory.find({
            userId,
            isCompleted: false,
            completionRate: { $gt: 5 },  // Watched at least 5%
        })
            .sort({ lastWatchedAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json({
            success: true,
            data: {
                videos: continueWatching.map(h => ({
                    videoId: h.videoId,
                    resumePosition: h.lastWatchedPosition,
                    completionRate: h.completionRate,
                    videoDuration: h.videoDuration,
                    totalWatchTime: h.totalWatchTime,
                    videoType: h.videoType,
                    lastWatchedAt: h.lastWatchedAt,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching continue watching:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/playback/user/:userId/stats
 * Get a user's overall watching statistics
 */
router.get('/user/:userId/stats', authenticate, async (req: Request, res: Response) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res)) return;
        const { userId } = req.params;

        const [summary, recentHistory] = await Promise.all([
            // Note: We import UserAnalyticsSummary here to avoid circular deps
            (await import('../../../shared/models/UserAnalytics.js')).UserAnalyticsSummary.findOne({ userId }).lean(),
            UserWatchHistory.find({ userId })
                .sort({ lastWatchedAt: -1 })
                .limit(5)
                .lean(),
        ]);

        res.json({
            success: true,
            data: {
                userId,
                stats: summary ? {
                    totalWatchTime: summary.totalWatchTime,
                    totalWatchTimeFormatted: formatDuration(summary.totalWatchTime),
                    totalVideosWatched: summary.totalVideosWatched,
                    totalReelsWatched: summary.totalReelsWatched,
                    totalCompletedVideos: summary.totalCompletedVideos,
                    totalSessions: summary.totalSessions,
                    todayWatchTime: summary.todayWatchTime,
                    todayWatchTimeFormatted: formatDuration(summary.todayWatchTime),
                    currentStreak: summary.currentStreak,
                    longestStreak: summary.longestStreak,
                    preferredQuality: summary.preferredQuality,
                    avgSessionDuration: summary.avgSessionDuration,
                    lastActiveDate: summary.lastActiveDate,
                } : null,
                recentlyWatched: recentHistory.map(h => ({
                    videoId: h.videoId,
                    completionRate: h.completionRate,
                    totalWatchTime: h.totalWatchTime,
                    lastWatchedAt: h.lastWatchedAt,
                    videoType: h.videoType,
                })),
            },
        });
    } catch (error: any) {
        console.error('[PLAYBACK] ❌ Error fetching user stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// SIGNED STREAMING URLs
// ==========================================

/**
 * GET /api/playback/stream/:videoId
 * Get signed streaming URLs for a video
 */
router.get('/stream/:videoId', async (req: Request, res: Response) => {
    console.log('[PLAYBACK] 🎬 Stream request received for videoId:', req.params.videoId);
    try {
        const { videoId } = req.params;

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

        const masterPlaylistPath = normalizePath(video.masterPlaylistUrl || '');
        if (!masterPlaylistPath) {
            return res.status(404).json({
                success: false,
                error: 'Video has no playlist',
            });
        }

        // include deviceType header when available so mobile clients
        // receive a signed URL they can use directly with the segment worker
        const reqDeviceType = (req.headers['x-vm-device-type'] as string) || undefined;
        const signedMaster = generateSignedUrl({
            videoId,
            path: masterPlaylistPath,  // Use actual R2 path from database
            expiresIn: TOKEN_EXPIRY_SECONDS,
            deviceType: reqDeviceType,
        });

        const signedOutputs = (video.outputs || []).map(output => {
            if (!output.playlistUrl) return null;

            const signed = generateSignedUrl({
                videoId,
                path: normalizePath(output.playlistUrl),
                expiresIn: TOKEN_EXPIRY_SECONDS,
                deviceType: reqDeviceType,
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
        const reqDeviceType = (req.headers['x-vm-device-type'] as string) || undefined;
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
                    deviceType: reqDeviceType,
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
