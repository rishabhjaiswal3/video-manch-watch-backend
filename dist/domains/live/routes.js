"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const Video_js_1 = require("../../shared/models/Video.js");
const Profile_js_1 = require("../../shared/models/Profile.js");
const VideoAnalytics_js_1 = require("../../shared/models/VideoAnalytics.js");
const VideoAnalytics_js_2 = require("../../shared/models/VideoAnalytics.js");
const auth_js_1 = require("../../shared/middleware/auth.js");
const adminAuth_js_1 = require("../../shared/middleware/adminAuth.js");
const rateLimiter_js_1 = require("../../shared/middleware/rateLimiter.js");
const authHelpers_js_1 = require("../../shared/utils/authHelpers.js");
const router = (0, express_1.Router)();
const RTMP_INGEST_URL = process.env.RTMP_INGEST_URL || 'rtmp://live.videomanch.com/live';
const BROWSER_INGEST_WS_URL = process.env.BROWSER_INGEST_WS_URL || 'wss://live.videomanch.com/live/ingest';
const LIVE_INGEST_SHARED_SECRET = process.env.LIVE_INGEST_SHARED_SECRET || '';
const getDefaultMasterPlaylistKey = (userType, userId, videoId) => `live/${userType}/${userId}/${videoId}/master.m3u8`;
const getPlaybackEntryUrl = (videoId) => `/playback/stream/${videoId}`;
const toCreatorUserType = (userType) => (userType === 'admin' ? 'creator' : userType);
const buildIngestPayload = (videoId, streamKey) => ({
    rtmpUrl: RTMP_INGEST_URL,
    rtmpKey: streamKey,
    wsIngestUrl: `${BROWSER_INGEST_WS_URL}/${videoId}?key=${streamKey}`,
});
const verifyIngestSecret = (req, res) => {
    if (!LIVE_INGEST_SHARED_SECRET) {
        console.error('[LIVE] ingest event misconfigured - missing LIVE_INGEST_SHARED_SECRET');
        res.status(500).json({ success: false, error: 'Ingest events are not configured.' });
        return false;
    }
    const providedSecret = req.header('x-live-ingest-secret');
    if (!providedSecret || providedSecret !== LIVE_INGEST_SHARED_SECRET) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return false;
    }
    return true;
};
router.post('/schedule', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, rateLimiter_js_1.liveLimiter, async (req, res) => {
    try {
        const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { title, description, thumbnail, tags, visibility = 'listed', masterPlaylistUrl, scheduledAt, allowLikes = true, allowDislikes = true, allowComments = true, } = req.body || {};
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, error: 'title is required.' });
        }
        const parsedSchedule = typeof scheduledAt === 'string' && scheduledAt.trim()
            ? new Date(scheduledAt)
            : new Date();
        if (Number.isNaN(parsedSchedule.getTime())) {
            return res.status(400).json({ success: false, error: 'scheduledAt must be a valid ISO date string.' });
        }
        const videoId = (0, uuid_1.v4)();
        const streamKey = crypto_1.default.randomBytes(24).toString('hex');
        const playlistKey = (typeof masterPlaylistUrl === 'string' && masterPlaylistUrl.trim())
            ? masterPlaylistUrl.trim()
            : getDefaultMasterPlaylistKey(userType, userId, videoId);
        const video = await Video_js_1.Video.create({
            videoId,
            userId,
            userType: toCreatorUserType(userType),
            title: title.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            status: 'completed',
            transcodingCompleted: true,
            contentType: 'live',
            isLive: false,
            liveStatus: 'scheduled',
            liveIngestStatus: 'idle',
            liveScheduledAt: parsedSchedule,
            streamKey,
            masterPlaylistUrl: playlistKey,
            thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
            tags: Array.isArray(tags) ? tags : [],
            visibility: visibility === 'unlisted' ? 'unlisted' : 'listed',
            allowLikes: Boolean(allowLikes),
            allowDislikes: Boolean(allowDislikes),
            allowComments: Boolean(allowComments),
            duration: 0,
            outputs: [],
            originalFile: {
                filename: `live-${videoId}.m3u8`,
                size: 0,
                mimeType: 'application/vnd.apple.mpegurl',
                r2Key: playlistKey,
            },
            statusHistory: [{
                    from: 'pending',
                    to: 'completed',
                    at: new Date(),
                    reason: 'live_scheduled',
                }],
        });
        return res.status(201).json({
            success: true,
            data: {
                videoId: video.videoId,
                title: video.title,
                streamKey,
                ingest: buildIngestPayload(video.videoId, streamKey),
                playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
                scheduledAt: video.liveScheduledAt,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to schedule stream:', {
            message: error?.message,
            stack: error?.stack,
            requestId: req.headers['x-request-id'] || null,
        });
        return res.status(500).json({ success: false, error: error.message || 'Failed to schedule live stream.' });
    }
});
router.get('/ingest/validate/:videoId', async (req, res) => {
    try {
        if (!LIVE_INGEST_SHARED_SECRET) {
            console.error('[LIVE] Ingest validate misconfigured - missing LIVE_INGEST_SHARED_SECRET');
            return res.status(500).json({ success: false, error: 'Ingest validation is not configured.' });
        }
        const providedSecret = req.header('x-live-ingest-secret');
        if (!providedSecret || providedSecret !== LIVE_INGEST_SHARED_SECRET) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { videoId } = req.params;
        const key = String(req.query.key || '');
        if (!key) {
            return res.status(400).json({ success: false, error: 'key is required' });
        }
        const video = await Video_js_1.Video.findOne({ videoId, contentType: 'live' })
            .select('videoId streamKey isLive liveStatus')
            .lean();
        if (!video) {
            return res.status(404).json({ success: false, error: 'Live stream not found' });
        }
        if (video.streamKey !== key) {
            return res.status(403).json({ success: false, error: 'Invalid stream key' });
        }
        return res.json({
            success: true,
            data: {
                videoId: video.videoId,
                streamKey: video.streamKey,
                rtmpUrl: RTMP_INGEST_URL,
                isLive: Boolean(video.isLive && video.liveStatus === 'live'),
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to validate ingest key:', {
            message: error?.message,
            stack: error?.stack,
        });
        return res.status(500).json({ success: false, error: 'Failed to validate ingest key' });
    }
});
router.get('/rtmp/validate/:streamKey', async (req, res) => {
    try {
        if (!LIVE_INGEST_SHARED_SECRET) {
            console.error('[LIVE] RTMP validate misconfigured - missing LIVE_INGEST_SHARED_SECRET');
            return res.status(500).json({ success: false, error: 'RTMP validation is not configured.' });
        }
        const providedSecret = req.header('x-live-ingest-secret');
        if (!providedSecret || providedSecret !== LIVE_INGEST_SHARED_SECRET) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { streamKey } = req.params;
        if (!streamKey) {
            return res.status(400).json({ success: false, error: 'streamKey is required' });
        }
        const video = await Video_js_1.Video.findOne({
            streamKey,
            contentType: 'live',
            isLive: true,
            liveStatus: 'live',
        })
            .select('videoId userId userType streamKey isLive liveStatus masterPlaylistUrl')
            .lean();
        if (!video) {
            return res.status(404).json({ success: false, error: 'Live stream not found for stream key' });
        }
        return res.json({
            success: true,
            data: {
                videoId: video.videoId,
                userId: video.userId,
                userType: video.userType,
                streamKey: video.streamKey,
                isLive: Boolean(video.isLive),
                liveStatus: video.liveStatus,
                masterPlaylistUrl: video.masterPlaylistUrl,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to validate rtmp stream key:', {
            message: error?.message,
            stack: error?.stack,
        });
        return res.status(500).json({ success: false, error: 'Failed to validate RTMP stream key' });
    }
});
router.post('/start', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, rateLimiter_js_1.liveLimiter, async (req, res) => {
    try {
        const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { title, description, thumbnail, tags, visibility = 'listed', masterPlaylistUrl, allowLikes = true, allowDislikes = true, allowComments = true, } = req.body || {};
        console.log('[LIVE] Start requested', {
            userId,
            userType,
            hasTitle: Boolean(title),
            visibility,
            hasMasterPlaylistUrlOverride: Boolean(masterPlaylistUrl),
            requestId: req.headers['x-request-id'] || null,
        });
        if (!title || typeof title !== 'string') {
            console.log('[LIVE] Start rejected - invalid title', { userId, userType, titleType: typeof title });
            return res.status(400).json({ success: false, error: 'title is required.' });
        }
        // Atomic check: prevent race condition where two simultaneous requests both pass the check
        const existingLive = await Video_js_1.Video.findOne({
            userId,
            contentType: 'live',
            isLive: true,
        }).select('videoId title liveStartedAt').lean();
        if (existingLive) {
            console.log('[LIVE] Start rejected - active stream already exists', {
                userId,
                existingVideoId: existingLive.videoId,
            });
            return res.status(409).json({
                success: false,
                error: 'You already have an active live stream.',
                data: {
                    videoId: existingLive.videoId,
                    title: existingLive.title,
                    startedAt: existingLive.liveStartedAt,
                    playbackEntryUrl: getPlaybackEntryUrl(existingLive.videoId),
                },
            });
        }
        const videoId = (0, uuid_1.v4)();
        const streamKey = crypto_1.default.randomBytes(24).toString('hex');
        const playlistKey = (typeof masterPlaylistUrl === 'string' && masterPlaylistUrl.trim())
            ? masterPlaylistUrl.trim()
            : getDefaultMasterPlaylistKey(userType, userId, videoId);
        console.log('[LIVE] Creating live stream record', {
            userId,
            userType,
            videoId,
            playlistKey,
            ingestBase: BROWSER_INGEST_WS_URL,
        });
        const now = new Date();
        const video = await Video_js_1.Video.create({
            videoId,
            userId,
            userType: toCreatorUserType(userType),
            title: title.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            status: 'completed',
            transcodingCompleted: true,
            contentType: 'live',
            isLive: true,
            liveStatus: 'live',
            liveIngestStatus: 'idle',
            liveStartedAt: now,
            streamKey,
            masterPlaylistUrl: playlistKey,
            thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
            tags: Array.isArray(tags) ? tags : [],
            visibility: visibility === 'unlisted' ? 'unlisted' : 'listed',
            allowLikes: Boolean(allowLikes),
            allowDislikes: Boolean(allowDislikes),
            allowComments: Boolean(allowComments),
            duration: 0,
            outputs: [],
            originalFile: {
                filename: `live-${videoId}.m3u8`,
                size: 0,
                mimeType: 'application/vnd.apple.mpegurl',
                r2Key: playlistKey,
            },
            statusHistory: [{
                    from: 'pending',
                    to: 'completed',
                    at: now,
                    reason: 'live_started',
                }],
        });
        console.log('[LIVE] Stream created', {
            userId,
            userType,
            videoId: video.videoId,
            playlistKey,
            wsIngestUrl: `${BROWSER_INGEST_WS_URL}/${video.videoId}?key=${streamKey}`,
            playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
        });
        return res.status(201).json({
            success: true,
            data: {
                videoId: video.videoId,
                title: video.title,
                streamKey,
                ingest: {
                    ...buildIngestPayload(video.videoId, streamKey),
                },
                playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
                startedAt: video.liveStartedAt,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to start stream:', {
            message: error?.message,
            stack: error?.stack,
            requestId: req.headers['x-request-id'] || null,
        });
        return res.status(500).json({ success: false, error: error.message || 'Failed to start live stream.' });
    }
});
router.post('/:videoId/end', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, async (req, res) => {
    try {
        const { userId, roles } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { videoId } = req.params;
        console.log('[LIVE] End requested', {
            userId,
            roles,
            videoId,
            requestId: req.headers['x-request-id'] || null,
        });
        const liveVideo = await Video_js_1.Video.findOne({ videoId, contentType: 'live' });
        if (!liveVideo) {
            console.log('[LIVE] End rejected - stream not found', { userId, videoId });
            return res.status(404).json({ success: false, error: 'Live stream not found.' });
        }
        if (!roles.includes('admin') && liveVideo.userId !== userId) {
            console.log('[LIVE] End rejected - forbidden', {
                userId,
                ownerUserId: liveVideo.userId,
                videoId,
            });
            return res.status(403).json({ success: false, error: 'Forbidden.' });
        }
        liveVideo.isLive = false;
        liveVideo.liveStatus = 'ended';
        liveVideo.liveIngestStatus = 'disconnected';
        liveVideo.liveEndedAt = new Date();
        liveVideo.streamKey = undefined;
        await liveVideo.save();
        console.log('[LIVE] Stream marked ended', {
            userId,
            videoId: liveVideo.videoId,
            liveEndedAt: liveVideo.liveEndedAt,
        });
        await VideoAnalytics_js_1.ActiveSession.deleteMany({ videoId });
        console.log('[LIVE] Active sessions cleared', { videoId });
        return res.json({
            success: true,
            data: {
                videoId: liveVideo.videoId,
                endedAt: liveVideo.liveEndedAt,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to end stream:', {
            message: error?.message,
            stack: error?.stack,
            requestId: req.headers['x-request-id'] || null,
        });
        return res.status(500).json({ success: false, error: error.message || 'Failed to end live stream.' });
    }
});
router.post('/:videoId/go-live', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, async (req, res) => {
    try {
        const { userId, roles } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { videoId } = req.params;
        const scheduledVideo = await Video_js_1.Video.findOne({ videoId, contentType: 'live' });
        if (!scheduledVideo) {
            return res.status(404).json({ success: false, error: 'Live stream not found.' });
        }
        if (!roles.includes('admin') && scheduledVideo.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden.' });
        }
        if (scheduledVideo.isLive && scheduledVideo.liveStatus === 'live') {
            return res.json({
                success: true,
                data: {
                    videoId: scheduledVideo.videoId,
                    liveStatus: scheduledVideo.liveStatus,
                    startedAt: scheduledVideo.liveStartedAt,
                    streamKey: scheduledVideo.streamKey,
                    ingest: buildIngestPayload(scheduledVideo.videoId, scheduledVideo.streamKey || ''),
                    playbackEntryUrl: getPlaybackEntryUrl(scheduledVideo.videoId),
                },
            });
        }
        const existingLive = await Video_js_1.Video.findOne({
            userId: scheduledVideo.userId,
            contentType: 'live',
            isLive: true,
            liveStatus: 'live',
            videoId: { $ne: scheduledVideo.videoId },
        }).select('videoId title liveStartedAt');
        if (existingLive) {
            return res.status(409).json({
                success: false,
                error: 'You already have an active live stream.',
                data: {
                    videoId: existingLive.videoId,
                    title: existingLive.title,
                    startedAt: existingLive.liveStartedAt,
                    playbackEntryUrl: getPlaybackEntryUrl(existingLive.videoId),
                },
            });
        }
        if (!scheduledVideo.streamKey) {
            scheduledVideo.streamKey = crypto_1.default.randomBytes(24).toString('hex');
        }
        scheduledVideo.isLive = true;
        scheduledVideo.liveStatus = 'live';
        scheduledVideo.liveIngestStatus = 'idle';
        scheduledVideo.liveStartedAt = new Date();
        if (!scheduledVideo.liveScheduledAt) {
            scheduledVideo.liveScheduledAt = scheduledVideo.liveStartedAt;
        }
        await scheduledVideo.save();
        return res.json({
            success: true,
            data: {
                videoId: scheduledVideo.videoId,
                title: scheduledVideo.title,
                liveStatus: scheduledVideo.liveStatus,
                startedAt: scheduledVideo.liveStartedAt,
                streamKey: scheduledVideo.streamKey,
                ingest: buildIngestPayload(scheduledVideo.videoId, scheduledVideo.streamKey),
                playbackEntryUrl: getPlaybackEntryUrl(scheduledVideo.videoId),
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to transition scheduled stream to live:', {
            message: error?.message,
            stack: error?.stack,
            requestId: req.headers['x-request-id'] || null,
        });
        return res.status(500).json({ success: false, error: error.message || 'Failed to go live.' });
    }
});
router.get('/my', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, async (req, res) => {
    try {
        const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const videos = await Video_js_1.Video.find({ userId, contentType: 'live' })
            .sort({ liveStartedAt: -1, createdAt: -1 })
            .limit(25)
            .lean();
        const [viewerRows, historicalRows] = await Promise.all([
            VideoAnalytics_js_1.ActiveSession.aggregate([
                { $match: { videoId: { $in: videos.map((v) => v.videoId) } } },
                { $group: { _id: '$videoId', viewers: { $sum: 1 } } },
            ]),
            VideoAnalytics_js_2.VideoAnalytics.aggregate([
                { $match: { videoId: { $in: videos.map((v) => v.videoId) } } },
                { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
            ]),
        ]);
        const viewerMap = new Map(viewerRows.map((row) => [row._id, Number(row.viewers || 0)]));
        const historicalMap = new Map(historicalRows.map((row) => [row._id, Number(row.totalViews || 0)]));
        return res.json({
            success: true,
            data: videos.map((video) => ({
                videoId: video.videoId,
                title: video.title,
                description: video.description,
                thumbnail: video.thumbnail,
                isLive: Boolean(video.isLive),
                liveStatus: video.liveStatus || (video.isLive ? 'live' : 'ended'),
                liveIngestStatus: video.liveIngestStatus || 'idle',
                liveScheduledAt: video.liveScheduledAt,
                liveStartedAt: video.liveStartedAt,
                liveEndedAt: video.liveEndedAt,
                viewers: viewerMap.get(video.videoId) || 0,
                totalViews: historicalMap.get(video.videoId) || 0,
                playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
            })),
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to fetch creator streams:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch live streams.' });
    }
});
router.get('/active', async (_req, res) => {
    try {
        const liveVideos = await Video_js_1.Video.find({
            contentType: 'live',
            isLive: true,
            liveStatus: 'live',
            status: 'completed',
            $or: [
                { liveIngestStatus: 'connected' },
                { liveIngestStatus: { $exists: false } },
            ],
        })
            .sort({ liveStartedAt: -1 })
            .limit(50)
            .lean();
        if (liveVideos.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const [viewerRows, historicalRows, profiles] = await Promise.all([
            VideoAnalytics_js_1.ActiveSession.aggregate([
                { $match: { videoId: { $in: liveVideos.map((v) => v.videoId) } } },
                { $group: { _id: '$videoId', viewers: { $sum: 1 } } },
            ]),
            VideoAnalytics_js_2.VideoAnalytics.aggregate([
                { $match: { videoId: { $in: liveVideos.map((v) => v.videoId) } } },
                { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
            ]),
            Profile_js_1.Profile.find({ userId: { $in: liveVideos.map((v) => v.userId) } })
                .select('userId displayName username avatar isVerified')
                .lean(),
        ]);
        const viewerMap = new Map(viewerRows.map((row) => [row._id, Number(row.viewers || 0)]));
        const historicalMap = new Map(historicalRows.map((row) => [row._id, Number(row.totalViews || 0)]));
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        return res.json({
            success: true,
            data: liveVideos.map((video) => {
                const profile = profileMap.get(video.userId);
                return {
                    videoId: video.videoId,
                    userId: video.userId,
                    title: video.title,
                    description: video.description,
                    thumbnail: video.thumbnail,
                    tags: video.tags || [],
                    startedAt: video.liveStartedAt || video.createdAt,
                    viewers: viewerMap.get(video.videoId) || 0,
                    totalViews: historicalMap.get(video.videoId) || 0,
                    channel: profile?.displayName || profile?.username || 'Unknown',
                    channelAvatar: profile?.avatar || '',
                    channelVerified: Boolean(profile?.isVerified),
                    playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
                };
            }),
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to fetch active streams:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch active streams.' });
    }
});
router.get('/scheduled', async (_req, res) => {
    try {
        const scheduledVideos = await Video_js_1.Video.find({
            contentType: 'live',
            isLive: false,
            liveStatus: 'scheduled',
            status: 'completed',
            liveScheduledAt: { $ne: null },
        })
            .sort({ liveScheduledAt: 1, createdAt: -1 })
            .limit(50)
            .lean();
        if (scheduledVideos.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: scheduledVideos.map((v) => v.userId) } })
            .select('userId displayName username avatar isVerified')
            .lean();
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        return res.json({
            success: true,
            data: scheduledVideos.map((video) => {
                const profile = profileMap.get(video.userId);
                return {
                    videoId: video.videoId,
                    userId: video.userId,
                    title: video.title,
                    description: video.description,
                    thumbnail: video.thumbnail,
                    tags: video.tags || [],
                    scheduledAt: video.liveScheduledAt,
                    channel: profile?.displayName || profile?.username || 'Unknown',
                    channelAvatar: profile?.avatar || '',
                    channelVerified: Boolean(profile?.isVerified),
                    playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
                };
            }),
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to fetch scheduled streams:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch scheduled streams.' });
    }
});
router.post('/ingest/events', async (req, res) => {
    try {
        if (!verifyIngestSecret(req, res))
            return;
        const { event, videoId, streamKey, source, reason } = req.body || {};
        if (event !== 'ingest_started' && event !== 'ingest_stopped') {
            return res.status(400).json({ success: false, error: 'event must be ingest_started or ingest_stopped' });
        }
        const query = { contentType: 'live' };
        if (typeof videoId === 'string' && videoId.trim())
            query.videoId = videoId.trim();
        else if (typeof streamKey === 'string' && streamKey.trim())
            query.streamKey = streamKey.trim();
        else
            return res.status(400).json({ success: false, error: 'videoId or streamKey is required' });
        const video = await Video_js_1.Video.findOne(query);
        if (!video) {
            return res.status(404).json({ success: false, error: 'Live stream not found' });
        }
        if (event === 'ingest_started') {
            if (!video.isLive)
                video.isLive = true;
            if (video.liveStatus !== 'live')
                video.liveStatus = 'live';
            if (!video.liveStartedAt)
                video.liveStartedAt = new Date();
            video.liveIngestStatus = 'connected';
            if (!video.streamKey && typeof streamKey === 'string' && streamKey.trim()) {
                video.streamKey = streamKey.trim();
            }
            await video.save();
            return res.json({
                success: true,
                data: {
                    videoId: video.videoId,
                    liveStatus: video.liveStatus,
                    liveIngestStatus: video.liveIngestStatus,
                    source: source || 'unknown',
                },
            });
        }
        if (video.liveStatus === 'live') {
            video.liveIngestStatus = 'disconnected';
            await video.save();
        }
        // Grace period: wait 8 seconds before clearing sessions.
        // Handles brief disconnects where the ingest reconnects within seconds.
        setTimeout(async () => {
            try {
                const current = await Video_js_1.Video.findOne({ videoId: video.videoId }).select('liveIngestStatus').lean();
                // Only clear sessions if still disconnected (not reconnected)
                if (current?.liveIngestStatus === 'disconnected') {
                    await VideoAnalytics_js_1.ActiveSession.deleteMany({ videoId: video.videoId });
                }
            }
            catch {
                // fire-and-forget, ignore errors
            }
        }, 8000);
        return res.json({
            success: true,
            data: {
                videoId: video.videoId,
                liveStatus: video.liveStatus,
                liveIngestStatus: video.liveIngestStatus || 'disconnected',
                source: source || 'unknown',
                reason: reason || null,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to process ingest event:', {
            message: error?.message,
            stack: error?.stack,
            requestId: req.headers['x-request-id'] || null,
        });
        return res.status(500).json({ success: false, error: error.message || 'Failed to process ingest event.' });
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map