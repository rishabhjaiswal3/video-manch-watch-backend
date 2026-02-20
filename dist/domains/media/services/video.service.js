"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const Video_js_1 = require("../../../models/Video.js");
const signedUrl_js_1 = require("../../../utils/signedUrl.js");
class VideoService {
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
            query.title = { $regex: params.search, $options: 'i' };
        }
        const [videos, total] = await Promise.all([
            Video_js_1.Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video_js_1.Video.countDocuments(query),
        ]);
        // Sign URLs for playback
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
            return videoObj;
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
        if (video.masterPlaylistUrl) {
            const { signedPath } = (0, signedUrl_js_1.generateSignedUrl)({
                videoId: video.videoId,
                path: video.masterPlaylistUrl,
            });
            videoObj.hlsUrl = signedPath;
        }
        return videoObj;
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
        const signedVideos = videos.map(v => {
            const videoObj = { ...v };
            if (v.masterPlaylistUrl) {
                const { signedPath } = (0, signedUrl_js_1.generateSignedUrl)({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                });
                videoObj.hlsUrl = signedPath;
            }
            return videoObj;
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