import type { CreateReelReportInput } from '../../../shared/schemas/social.js';
type CreateReelReportRequest = CreateReelReportInput & {
    reporterIp?: string;
    reporterUserAgent?: string;
};
export declare class ReelReportService {
    createReelReport(input: CreateReelReportRequest): Promise<{
        reportId: string;
        status: 'pending';
    }>;
}
export {};
//# sourceMappingURL=reelReport.service.d.ts.map