import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoEngagement extends Document {
  videoId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

const VideoEngagementSchema = new Schema<IVideoEngagement>(
  {
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index - one engagement per user per video
VideoEngagementSchema.index({ videoId: 1, userId: 1 }, { unique: true });

// Index for querying user's liked/disliked videos
VideoEngagementSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const VideoEngagement = mongoose.model<IVideoEngagement>('VideoEngagement', VideoEngagementSchema);
