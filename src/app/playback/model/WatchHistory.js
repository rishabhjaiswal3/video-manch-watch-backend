import mongoose, { Schema } from 'mongoose';

const WatchHistorySchema = new Schema(
  {
    userId:        { type: String, required: true },
    videoId:       { type: String, required: true },
    progressSecs:  { type: Number, default: 0, min: 0 },
    durationSecs:  { type: Number, default: 0, min: 0 },
    completionPct: { type: Number, default: 0, min: 0, max: 100 },
    completed:     { type: Boolean, default: false },
    watchedAt:     { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One record per user+video — upserted on every watchtime flush
WatchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });

// History list — most recently watched first
WatchHistorySchema.index({ userId: 1, watchedAt: -1 });

// Continue watching — incomplete only
WatchHistorySchema.index({ userId: 1, completed: 1, watchedAt: -1 });

export const WatchHistory = mongoose.model('WatchHistory', WatchHistorySchema);
