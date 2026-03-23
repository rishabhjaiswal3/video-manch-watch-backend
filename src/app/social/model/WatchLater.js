import mongoose, { Schema } from 'mongoose';

const WatchLaterSchema = new Schema({
  userId: { type: String, required: true, index: true },
  videoId: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

WatchLaterSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const WatchLater = mongoose.model('WatchLater', WatchLaterSchema);
