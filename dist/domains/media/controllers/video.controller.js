"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const video_service_js_1 = require("../services/video.service.js");
const videoService = new video_service_js_1.VideoService();
class VideoController {
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