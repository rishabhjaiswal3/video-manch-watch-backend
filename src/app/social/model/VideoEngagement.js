import mongoose, { Schema } from 'mongoose';

const VideoEngagementSchema = new Schema(
  {
    videoId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

VideoEngagementSchema.index({ videoId: 1, userId: 1 }, { unique: true });
VideoEngagementSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const VideoEngagement = mongoose.model('VideoEngagement', VideoEngagementSchema);
