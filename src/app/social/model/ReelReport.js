import mongoose, { Schema } from 'mongoose';

const ReelReportSchema = new Schema(
  {
    videoId: { type: String, required: true, index: true },
    reporterUserId: { type: String },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 1000 },
    reporterIp: { type: String },
    reporterUserAgent: { type: String },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending', index: true },
  },
  { timestamps: true }
);

export const ReelReport = mongoose.model('ReelReport', ReelReportSchema);
