import mongoose, { Document } from 'mongoose';
export type ReelReportReason = 'violence' | 'hate' | 'sexual' | 'misinformation' | 'spam' | 'copyright' | 'other';
export interface IReelReport extends Document {
    reportId: string;
    videoId: string;
    reason: ReelReportReason;
    details?: string;
    source: 'reels';
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    submittedAt?: Date;
    reporterIp?: string;
    reporterUserAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ReelReport: mongoose.Model<IReelReport, {}, {}, {}, mongoose.Document<unknown, {}, IReelReport, {}, {}> & IReelReport & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ReelReport.d.ts.map