"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchLaterController = void 0;
const watchLater_service_js_1 = require("../services/watchLater.service.js");
const service = new watchLater_service_js_1.WatchLaterService();
class WatchLaterController {
    async add(req, res) {
        try {
            const userId = req.user.userId;
            const { videoId } = req.params;
            const result = await service.add(userId, videoId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            if (err.message === 'Video not found') {
                res.status(404).json({ success: false, error: 'Video not found' });
            }
            else {
                res.status(500).json({ success: false, error: err.message });
            }
        }
    }
    async remove(req, res) {
        try {
            const userId = req.user.userId;
            const { videoId } = req.params;
            const result = await service.remove(userId, videoId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getList(req, res) {
        try {
            const userId = req.user.userId;
            const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
            const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
            const result = await service.getList(userId, page, limit);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getStatus(req, res) {
        try {
            const userId = req.user.userId;
            const { videoId } = req.params;
            const result = await service.getStatus(userId, videoId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.WatchLaterController = WatchLaterController;
//# sourceMappingURL=watchLater.controller.js.map