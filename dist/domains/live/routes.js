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
const getDefaultMasterPlaylistKey = (userType, userId, videoId) => `live/${userType}/${userId}/${videoId}/master.m3u8`;
const getPlaybackEntryUrl = (videoId) => `/playback/stream/${videoId}`;
router.post('/start', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, rateLimiter_js_1.liveLimiter, async (req, res) => {
    try {
        const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { title, description, thumbnail, tags, visibility = 'listed', masterPlaylistUrl, allowLikes = true, allowDislikes = true, allowComments = true, } = req.body || {};
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, error: 'title is required.' });
        }
        const existingLive = await Video_js_1.Video.findOne({
            userId,
            contentType: 'live',
            isLive: true,
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
        const videoId = (0, uuid_1.v4)();
        const streamKey = crypto_1.default.randomBytes(24).toString('hex');
        const playlistKey = (typeof masterPlaylistUrl === 'string' && masterPlaylistUrl.trim())
            ? masterPlaylistUrl.trim()
            : getDefaultMasterPlaylistKey(userType, userId, videoId);
        const now = new Date();
        const video = await Video_js_1.Video.create({
            videoId,
            userId,
            userType: userType === 'admin' ? 'creator' : userType,
            title: title.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            status: 'completed',
            transcodingCompleted: true,
            contentType: 'live',
            isLive: true,
            liveStatus: 'live',
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
        return res.status(201).json({
            success: true,
            data: {
                videoId: video.videoId,
                title: video.title,
                streamKey,
                ingest: {
                    rtmpUrl: RTMP_INGEST_URL,
                    rtmpKey: streamKey,
                    wsIngestUrl: `${BROWSER_INGEST_WS_URL}/${video.videoId}?key=${streamKey}`,
                },
                playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
                startedAt: video.liveStartedAt,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to start stream:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to start live stream.' });
    }
});
router.post('/:videoId/end', auth_js_1.authenticate, adminAuth_js_1.requireAdminOrCreator, async (req, res) => {
    try {
        const { userId, roles } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { videoId } = req.params;
        const liveVideo = await Video_js_1.Video.findOne({ videoId, contentType: 'live' });
        if (!liveVideo) {
            return res.status(404).json({ success: false, error: 'Live stream not found.' });
        }
        if (!roles.includes('admin') && liveVideo.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden.' });
        }
        liveVideo.isLive = false;
        liveVideo.liveStatus = 'ended';
        liveVideo.liveEndedAt = new Date();
        liveVideo.streamKey = undefined;
        await liveVideo.save();
        await VideoAnalytics_js_1.ActiveSession.deleteMany({ videoId });
        return res.json({
            success: true,
            data: {
                videoId: liveVideo.videoId,
                endedAt: liveVideo.liveEndedAt,
            },
        });
    }
    catch (error) {
        console.error('[LIVE] Failed to end stream:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to end live stream.' });
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
            status: 'completed',
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
exports.default = router;
//# sourceMappingURL=routes.js.map