import mongoose, { Schema } from 'mongoose';

const VideoViewSchema = new Schema(
  {
    videoId:   { type: String, required: true },
    userId:    { type: String, default: null },  // null for guests
    sessionId: { type: String, required: true },
    viewedAt:  { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One view per user per video (guests tracked by sessionId)
VideoViewSchema.index({ videoId: 1, userId: 1 }, { sparse: true });
VideoViewSchema.index({ videoId: 1, sessionId: 1 }, { unique: true });

// TTL — guest views expire after 30 days (keep storage lean)
VideoViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const VideoView = mongoose.model('VideoView', VideoViewSchema);
