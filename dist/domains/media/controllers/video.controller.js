"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const video_service_js_1 = require("../services/video.service.js");
const videoService = new video_service_js_1.VideoService();
class VideoController {
    async registerVod(req, res) {
        try {
            const internalKey = req.headers['x-internal-key'];
            if (internalKey !== process.env.INTERNAL_API_KEY) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized',
                });
            }
            const { userId, userType, title, description, category, masterPlaylistUrl, thumbnail, duration, contentType, source, sourceStreamId, } = req.body;
            if (!userId || !userType || !title || !masterPlaylistUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, userType, title, masterPlaylistUrl',
                });
            }
            const result = await videoService.registerVOD({
                userId,
                userType,
                title,
                description,
                category,
                masterPlaylistUrl,
                thumbnail,
                duration,
                contentType,
                source,
                sourceStreamId,
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[VIDEO] Error registering VOD:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to register VOD',
            });
        }
    }
    async listVideos(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(50, parseInt(req.query.limit) || 20);
            const search = req.query.search;
            const result = await videoService.listVideos({ page, limit, search });
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[VIDEO] Error listing videos:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch videos',
            });
        }
    }
    async getVideo(req, res) {
        try {
            const { videoId } = req.params;
            const video = await videoService.getVideoById(videoId);
            if (!video) {
                return res.status(404).json({
                    success: false,
                    error: 'Video not found or processing',
                });
            }
            return res.status(200).json({
                success: true,
                data: video,
            });
        }
        catch (error) {
            console.error('[VIDEO] Error fetching video:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch video details',
            });
        }
    }
    async listReels(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(50, parseInt(req.query.limit) || 10);
            const result = await videoService.listReels({ page, limit });
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[VIDEO] Error fetching reels:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch reels',
            });
        }
    }
}
exports.VideoController = VideoController;
//# sourceMappingURL=video.controller.js.map