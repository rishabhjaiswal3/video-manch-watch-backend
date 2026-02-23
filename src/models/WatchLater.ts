import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchLater extends Document {
  userId: string;
  videoId: string;
  addedAt: Date;
}

const WatchLaterSchema = new Schema<IWatchLater>({
  userId: { type: String, required: true, index: true },
  videoId: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

// Compound unique index — one entry per user per video
WatchLaterSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const WatchLater = mongoose.model<IWatchLater>('WatchLater', WatchLaterSchema);
