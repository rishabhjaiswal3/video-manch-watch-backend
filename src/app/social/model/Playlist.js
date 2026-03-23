import mongoose, { Schema } from 'mongoose';

const PlaylistSchema = new Schema(
  {
    playlistId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    videoIds: [{ type: String }],
    thumbnailUrl: { type: String, default: null },
  },
  { timestamps: true }
);

PlaylistSchema.index({ userId: 1, createdAt: -1 });

export const Playlist = mongoose.model('Playlist', PlaylistSchema);
