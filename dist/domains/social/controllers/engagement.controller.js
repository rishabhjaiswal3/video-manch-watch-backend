"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementController = void 0;
const engagement_service_js_1 = require("../services/engagement.service.js");
const authHelpers_js_1 = require("../../../utils/authHelpers.js");
const engagementService = new engagement_service_js_1.EngagementService();
class EngagementController {
    /**
     * Like a video
     */
    async likeVideo(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { videoId } = req.params;
            const result = await engagementService.likeVideo(userId, videoId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Like video error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to like video',
            });
        }
    }
    /**
     * Dislike a video
     */
    async dislikeVideo(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { videoId } = req.params;
            const result = await engagementService.dislikeVideo(userId, videoId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Dislike video error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to dislike video',
            });
        }
    }
    /**
     * Remove engagement (unlike/undislike)
     */
    async removeEngagement(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { videoId } = req.params;
            const result = await engagementService.removeEngagement(userId, videoId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Remove engagement error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to remove engagement',
            });
        }
    }
    /**
     * Get video engagement stats
     */
    async getVideoEngagement(req, res) {
        try {
            const { videoId } = req.params;
            const result = await engagementService.getVideoEngagement(videoId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Get video engagement error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to get engagement stats',
            });
        }
    }
    /**
     * Get user's engagement status on a video
     */
    async getUserEngagementStatus(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { videoId } = req.params;
            const result = await engagementService.getUserEngagementStatus(userId, videoId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Get user engagement status error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get engagement status',
            });
        }
    }
    /**
     * Get user's liked videos
     */
    async getUserLikedVideos(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await engagementService.getUserLikedVideos(userId, page, limit);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[ENGAGEMENT] Get liked videos error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get liked videos',
            });
        }
    }
}
exports.EngagementController = EngagementController;
//# sourceMappingURL=engagement.controller.js.map