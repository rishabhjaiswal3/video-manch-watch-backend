"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReelReportController = void 0;
const reelReport_service_js_1 = require("../services/reelReport.service.js");
const reelReportService = new reelReport_service_js_1.ReelReportService();
class ReelReportController {
    async reportReel(req, res) {
        try {
            const payload = req.body;
            const result = await reelReportService.createReelReport({
                ...payload,
                reporterIp: req.ip,
                reporterUserAgent: req.get('user-agent') || '',
            });
            return res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[REEL-REPORT] Submit report error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Video not found',
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to submit report',
            });
        }
    }
}
exports.ReelReportController = ReelReportController;
//# sourceMappingURL=reelReport.controller.js.map