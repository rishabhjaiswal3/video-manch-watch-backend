import mongoose, { Schema, Document } from 'mongoose';

export type ReelReportReason =
  | 'violence'
  | 'hate'
  | 'sexual'
  | 'misinformation'
  | 'spam'
  | 'copyright'
  | 'other';

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

const ReelReportSchema = new Schema<IReelReport>(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['violence', 'hate', 'sexual', 'misinformation', 'spam', 'copyright', 'other'],
      required: true,
    },
    details: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    source: {
      type: String,
      enum: ['reels'],
      required: true,
      default: 'reels',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
      default: 'pending',
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    reporterIp: {
      type: String,
      maxlength: 128,
    },
    reporterUserAgent: {
      type: String,
      maxlength: 512,
    },
  },
  { timestamps: true }
);

ReelReportSchema.index({ videoId: 1, createdAt: -1 });
ReelReportSchema.index({ reason: 1, createdAt: -1 });

export const ReelReport = mongoose.model<IReelReport>('ReelReport', ReelReportSchema);
