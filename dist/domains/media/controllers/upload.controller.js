"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const upload_service_js_1 = require("../services/upload.service.js");
const authHelpers_js_1 = require("../../../shared/utils/authHelpers.js");
const uploadService = new upload_service_js_1.UploadService();
class UploadController {
    /**
     * Initialize upload
     */
    async init(req, res) {
        try {
            const { videoId, filename, fileSize, mimeType, title, description, contentType } = req.body;
            const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.initializeUpload(userId, userType, {
                filename,
                fileSize,
                mimeType,
                title,
                description,
                contentType,
                videoId,
            });
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[UPLOAD-INIT] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * Complete upload
     */
    async complete(req, res) {
        try {
            const { videoId } = req.body;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.completeUpload(userId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[UPLOAD-COMPLETE] Error:', error);
            const status = error.message.includes('Unauthorized') ? 403 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * Get status
     */
    async getStatus(req, res) {
        try {
            const { videoId } = req.params;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.getStatus(userId, videoId);
            if (!result)
                return res.status(404).json({ success: false, error: 'Video not found' });
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[UPLOAD-STATUS] Error:', error);
            const status = error.message.includes('Unauthorized') ? 403 : 500;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * List videos
     */
    async listVideos(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const contentType = req.query.contentType;
            const result = await uploadService.listCreatorVideos(userId, { page, limit, status, contentType });
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[UPLOAD-LIST] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Queue stats
     */
    async getQueueStats(req, res) {
        try {
            const result = await uploadService.getQueueStats();
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            console.error('[QUEUE-STATS] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Retry upload
     */
    async retry(req, res) {
        try {
            const { videoId } = req.params;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.retryTranscoding(userId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[UPLOAD-RETRY] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * Get Raw URL
     */
    async getRawUrl(req, res) {
        try {
            const { videoId } = req.params;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.getRawUrl(userId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[RAW-URL] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * Update video
     */
    async update(req, res) {
        try {
            const { videoId } = req.params;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { title, description } = req.body;
            const result = await uploadService.updateVideo(userId, videoId, { title, description });
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[VIDEO-UPDATE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * Delete video
     */
    async delete(req, res) {
        try {
            const { videoId } = req.params;
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const result = await uploadService.deleteVideo(userId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[VIDEO-DELETE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
}
exports.UploadController = UploadController;
//# sourceMappingURL=upload.controller.js.map