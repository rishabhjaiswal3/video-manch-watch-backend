import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  playlistId: string;
  userId: string;
  title: string;
  videoIds: string[];
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    playlistId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    videoIds: [{ type: String }],
    thumbnailUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PlaylistSchema.index({ userId: 1, createdAt: -1 });

export const Playlist = mongoose.model<IPlaylist>('Playlist', PlaylistSchema);
