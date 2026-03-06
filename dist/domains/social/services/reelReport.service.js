"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReelReportService = void 0;
const uuid_1 = require("uuid");
const ReelReport_js_1 = require("../../../shared/models/ReelReport.js");
const Video_js_1 = require("../../../shared/models/Video.js");
class ReelReportService {
    async createReelReport(input) {
        const video = await Video_js_1.Video.findOne({ videoId: input.videoId, status: 'completed' }).select('videoId').lean();
        if (!video) {
            throw new Error('Video not found');
        }
        const reportId = (0, uuid_1.v4)();
        await ReelReport_js_1.ReelReport.create({
            reportId,
            videoId: input.videoId,
            reason: input.reason,
            details: input.details || '',
            source: input.source,
            submittedAt: input.submittedAt,
            reporterIp: input.reporterIp,
            reporterUserAgent: input.reporterUserAgent,
            status: 'pending',
        });
        return {
            reportId,
            status: 'pending',
        };
    }
}
exports.ReelReportService = ReelReportService;
//# sourceMappingURL=reelReport.service.js.map