"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const Video_js_1 = require("../../../shared/models/Video.js");
const Profile_js_1 = require("../../../shared/models/Profile.js");
const signedUrl_js_1 = require("../../../shared/utils/signedUrl.js");
const uuid_1 = require("uuid");
class VideoService {
    async getProfileMap(userIds) {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueUserIds.length === 0)
            return new Map();
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: uniqueUserIds } })
            .select('userId username displayName avatar isVerified')
            .lean();
        return new Map(profiles.map((profile) => [profile.userId, profile]));
    }
    enrichVideoWithChannel(video, profileMap) {
        const profile = profileMap.get(video.userId);
        const channelName = profile?.displayName || profile?.username || 'Unknown user';
        return {
            ...video,
            channel: channelName,
            channelAvatar: profile?.avatar || '',
            channelUsername: profile?.username || '',
            channelVerified: Boolean(profile?.isVerified),
        };
    }
    /**
     * Register a VOD entry created from live recording.
     */
    async registerVOD(input) {
        const videoId = (0, uuid_1.v4)();
        await Video_js_1.Video.create({
            videoId,
            userId: input.userId,
            userType: input.userType,
            title: input.title,
            description: input.description,
            status: 'completed',
            transcodingCompleted: true,
            contentType: input.contentType || 'vod',
            masterPlaylistUrl: input.masterPlaylistUrl,
            thumbnail: input.thumbnail,
            duration: input.duration || 0,
            outputs: [],
            originalFile: {
                filename: `live-recording-${videoId}.m3u8`,
                size: 0,
                mimeType: 'application/vnd.apple.mpegurl',
                r2Key: input.masterPlaylistUrl,
            },
            statusHistory: [{
                    from: 'pending',
                    to: 'completed',
                    at: new Date(),
                    reason: input.source || 'live_recording',
                }],
        });
        return { videoId };
    }
    /**
     * List public videos (VOD/Live), excluding Reels by default
     */
    async listVideos(params) {
        const skip = (params.page - 1) * params.limit;
        // Schema uses 'status: completed', 'contentType: vod/reel'
        const query = {
            status: 'completed',
            contentType: { $ne: 'reel' }, // Exclude reels from main feed
        };
        if (params.search) {
            const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: safeSearch, $options: 'i' };
        }
        const [videos, total] = await Promise.all([
            Video_js_1.Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video_js_1.Video.countDocuments(query),
        ]);
        const profileMap = await this.getProfileMap(videos.map((v) => v.userId));
        // Sign URLs for playback + attach channel info
        const signedVideos = videos.map(v => {
            const videoObj = { ...v };
            if (v.masterPlaylistUrl) {
                // masterPlaylistUrl is usually the R2 key or path.
                // We need to sign it.
                const { signedPath } = (0, signedUrl_js_1.generateSignedUrl)({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                });
                videoObj.hlsUrl = signedPath;
            }
            return this.enrichVideoWithChannel(videoObj, profileMap);
        });
        return {
            videos: signedVideos,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }
    /**
     * Get single video details
     */
    async getVideoById(videoId) {
        // Queries by 'videoId' field (string UUID), not Mongoose _id
        const video = await Video_js_1.Video.findOne({ videoId: videoId }).lean();
        if (!video || video.status !== 'completed')
            return null;
        const videoObj = { ...video };
        const profileMap = await this.getProfileMap([video.userId]);
        if (video.masterPlaylistUrl) {
            const { signedPath } = (0, signedUrl_js_1.generateSignedUrl)({
                videoId: video.videoId,
                path: video.masterPlaylistUrl,
                deviceType: 'web',
            });
            videoObj.hlsUrl = signedPath;
        }
        return this.enrichVideoWithChannel(videoObj, profileMap);
    }
    /**
     * List Reels (vertical short videos)
     */
    async listReels(params) {
        const skip = (params.page - 1) * params.limit;
        const query = {
            status: 'completed',
            contentType: 'reel',
        };
        const [videos, total] = await Promise.all([
            Video_js_1.Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video_js_1.Video.countDocuments(query),
        ]);
        const profileMap = await this.getProfileMap(videos.map((v) => v.userId));
        const signedVideos = videos.map(v => {
            const videoObj = { ...v };
            if (v.masterPlaylistUrl) {
                const { signedPath } = (0, signedUrl_js_1.generateSignedUrl)({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                    deviceType: 'web',
                });
                videoObj.hlsUrl = signedPath;
            }
            const enriched = this.enrichVideoWithChannel(videoObj, profileMap);
            return {
                ...enriched,
                username: enriched.channel,
                avatar: enriched.channelAvatar,
            };
        });
        return {
            videos: signedVideos,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }
}
exports.VideoService = VideoService;
//# sourceMappingURL=video.service.js.map