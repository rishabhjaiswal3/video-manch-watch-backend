"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VideoAnalytics_js_1 = require("../../../shared/models/VideoAnalytics.js");
const UserAnalytics_js_1 = require("../../../shared/models/UserAnalytics.js");
const Video_js_1 = require("../../../shared/models/Video.js");
const env_js_1 = require("../../../shared/config/env.js");
const signedUrl_js_1 = require("../../../shared/utils/signedUrl.js");
const r2Service_js_1 = require("../../../infra/storage/r2Service.js");
const r2_js_1 = require("../../../shared/config/r2.js");
const auth_js_1 = require("../../../shared/middleware/auth.js");
const authHelpers_js_1 = require("../../../shared/utils/authHelpers.js");
const analyticsWorker_js_1 = require("../../../workers/services/analyticsWorker.js");
const router = (0, express_1.Router)();
// Token expiry time (1 hour by default, configurable)
const TOKEN_EXPIRY_SECONDS = (0, env_js_1.getNumericEnv)('VIDEO_TOKEN_EXPIRY_SECONDS', 3600);
const SEGMENT_BASE_URL = process.env.VIDEO_SEGMENT_BASE_URL || 'https://video-segment.videomanch.com';
const DEFAULT_ANALYTICS_DAYS = (0, env_js_1.getNumericEnv)('ANALYTICS_DEFAULT_DAYS', 7);
const normalizePath = (input) => {
    if (!input)
        return '';
    try {
        if (input.startsWith('http://') || input.startsWith('https://')) {
            const parsed = new URL(input);
            return parsed.pathname.replace(/^\//, '');
        }
    }
    catch {
        // fall through
    }
    return input.replace(/^\//, '');
};
function formatDuration(seconds) {
    if (seconds === 0)
        return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    if (minutes > 0)
        return `${minutes}m ${secs}s`;
    return `${secs}s`;
}
const ensureCanAccessUserAnalytics = (req, res) => {
    const authUser = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
    const requestedUserId = req.params.userId;
    if (authUser.userType !== 'admin' && authUser.userId !== requestedUserId) {
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
router.post('/events', async (req, res) => {
    try {
        const { events } = req.body;
        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ success: false, error: 'events array required' });
        }
        // Filter valid events
        const validEvents = [];
        for (const event of events) {
            if (event.videoId && event.sessionId && event.type) {
                validEvents.push(event);
            }
        }
        if (validEvents.length === 0) {
            return res.status(200).json({ success: true, received: 0 });
        }
        // Push to Redis queue (fast — non-blocking)
        const pushed = await (0, analyticsWorker_js_1.pushEventsToRedis)(validEvents);
        console.log(`[PLAYBACK] 📥 Pushed ${pushed} events to Redis`);
        // Update active sessions in real-time (for live viewer counts)
        // These are fire-and-forget — don't block the response
        for (const event of validEvents) {
            if (event.type === 'heartbeat' || event.type === 'play' || event.type === 'watchtime') {
                (0, analyticsWorker_js_1.updateActiveSession)(event).catch(() => { });
            }
            if (event.type === 'ended') {
                (0, analyticsWorker_js_1.removeActiveSession)(event.sessionId).catch(() => { });
            }
        }
        // Return immediately
        res.status(200).json({ success: true, received: validEvents.length });
    }
    catch (error) {
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
router.get('/stats/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { days = DEFAULT_ANALYTICS_DAYS } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateStr = startDate.toISOString().split('T')[0];
        const stats = await VideoAnalytics_js_1.VideoAnalytics.find({
            videoId,
            date: { $gte: startDateStr },
        }).sort({ date: -1 });
        // Get current concurrent viewers
        const concurrent = await VideoAnalytics_js_1.ActiveSession.countDocuments({ videoId });
        // Aggregate totals
        const totals = stats.reduce((acc, day) => ({
            views: acc.views + day.views,
            totalWatchTime: acc.totalWatchTime + day.totalWatchTime,
            plays: acc.plays + day.totalPlays,
            completions: acc.completions + day.completions,
        }), { views: 0, totalWatchTime: 0, plays: 0, completions: 0 });
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/concurrent/:videoId
 * Get current concurrent viewers for a video
 */
router.get('/concurrent/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const concurrent = await VideoAnalytics_js_1.ActiveSession.countDocuments({ videoId });
        const sessions = await VideoAnalytics_js_1.ActiveSession.find({ videoId }).select('-_id -__v');
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching concurrent:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/live
 * Get all active viewing sessions across all videos
 */
router.get('/live', async (req, res) => {
    try {
        const sessions = await VideoAnalytics_js_1.ActiveSession.aggregate([
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
        const totalViewers = await VideoAnalytics_js_1.ActiveSession.countDocuments();
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching live stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/overview
 * Get platform-wide playback analytics
 */
router.get('/overview', async (req, res) => {
    try {
        const { days = DEFAULT_ANALYTICS_DAYS } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateStr = startDate.toISOString().split('T')[0];
        const stats = await VideoAnalytics_js_1.VideoAnalytics.aggregate([
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
        const activeViewers = await VideoAnalytics_js_1.ActiveSession.countDocuments();
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching overview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ==========================================
// USER WATCH HISTORY APIs
// ==========================================
/**
 * GET /api/playback/user/:userId/history
 * Get a user's watch history (recently watched videos)
 */
router.get('/user/:userId/history', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res))
            return;
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [history, total] = await Promise.all([
            UserAnalytics_js_1.UserWatchHistory.find({ userId })
                .sort({ lastWatchedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            UserAnalytics_js_1.UserWatchHistory.countDocuments({ userId }),
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching user history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/user/:userId/continue
 * Get videos the user started but hasn't finished (for "Continue Watching")
 */
router.get('/user/:userId/continue', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res))
            return;
        const { userId } = req.params;
        const { limit = 10 } = req.query;
        const continueWatching = await UserAnalytics_js_1.UserWatchHistory.find({
            userId,
            isCompleted: false,
            completionRate: { $gt: 5 }, // Watched at least 5%
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error fetching continue watching:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/user/:userId/stats
 * Get a user's overall watching statistics
 */
router.get('/user/:userId/stats', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!ensureCanAccessUserAnalytics(req, res))
            return;
        const { userId } = req.params;
        const [summary, recentHistory] = await Promise.all([
            // Note: We import UserAnalyticsSummary here to avoid circular deps
            (await import('../../../shared/models/UserAnalytics.js')).UserAnalyticsSummary.findOne({ userId }).lean(),
            UserAnalytics_js_1.UserWatchHistory.find({ userId })
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
    }
    catch (error) {
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
router.get('/stream/:videoId', async (req, res) => {
    console.log('[PLAYBACK] 🎬 Stream request received for videoId:', req.params.videoId);
    try {
        const { videoId } = req.params;
        console.log('[PLAYBACK] 🔍 Looking up video in database...');
        const video = await Video_js_1.Video.findOne({
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
        const signedMaster = (0, signedUrl_js_1.generateSignedUrl)({
            videoId,
            path: masterPlaylistPath, // Use actual R2 path from database
            expiresIn: TOKEN_EXPIRY_SECONDS,
        });
        const signedOutputs = (video.outputs || []).map(output => {
            if (!output.playlistUrl)
                return null;
            const signed = (0, signedUrl_js_1.generateSignedUrl)({
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error generating signed URLs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/playback/master/:videoId
 * Returns rewritten master playlist with signed variant URLs
 */
router.get('/master/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const token = req.query.token;
        const expires = req.query.expires;
        const vid = req.query.vid;
        if (!token || !expires || !vid) {
            return res.status(403).send('Forbidden: Token required');
        }
        const isValid = (0, signedUrl_js_1.verifySignedUrl)(`playback/master/${videoId}`, videoId, token, parseInt(expires, 10));
        if (!isValid) {
            return res.status(403).send('Forbidden: Invalid or expired token');
        }
        const video = await Video_js_1.Video.findOne({
            videoId,
            status: 'completed',
        }).lean();
        if (!video || !video.masterPlaylistUrl) {
            return res.status(404).send('Playlist not found');
        }
        const masterKey = normalizePath(video.masterPlaylistUrl);
        const baseDir = masterKey.substring(0, masterKey.lastIndexOf('/') + 1);
        const downloadUrl = await r2Service_js_1.r2Service.getDownloadPresignedUrl(r2_js_1.R2_BUCKETS.TRANSCODED, masterKey, 60);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return res.status(502).send('Failed to fetch master playlist');
        }
        const playlistText = await response.text();
        const rewritten = playlistText
            .split(/\r?\n/)
            .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                return line;
            let variantKey = trimmed;
            try {
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                    const parsed = new URL(trimmed);
                    variantKey = parsed.pathname.replace(/^\//, '');
                }
                else {
                    variantKey = normalizePath(`${baseDir}${trimmed}`);
                }
            }
            catch {
                variantKey = normalizePath(`${baseDir}${trimmed}`);
            }
            const signed = (0, signedUrl_js_1.generateSignedUrl)({
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
    }
    catch (error) {
        console.error('[PLAYBACK] ❌ Error serving master playlist:', error);
        return res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
//# sourceMappingURL=playback.route.impl.js.map