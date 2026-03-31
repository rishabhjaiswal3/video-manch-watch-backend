import mongoose, { Schema } from 'mongoose';

const VideoOutputSchema = new Schema({
  quality: { type: String, required: true },
  r2Key: { type: String },
  url: { type: String },
  size: { type: Number },
  playlistUrl: { type: String },
  segmentCount: { type: Number },
});

const VideoSchema = new Schema(
  {
    videoId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userType: { type: String, enum: ['user', 'creator'], default: 'user' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    originalFile: {
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
      r2Key: { type: String, required: true },
    },
    originalMetadata: {
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
      codec: { type: String },
      bitrate: { type: Number },
      fps: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'uploading', 'queued', 'processing', 'completed', 'failed', 'deleted'],
      default: 'pending',
      index: true,
    },
    statusHistory: [{ from: String, to: String, at: { type: Date, default: Date.now }, reason: String }],
    transcoding: {
      jobId: { type: String },
      progress: { type: Number, default: 0 },
      startedAt: { type: Date },
      completedAt: { type: Date },
      error: { type: String },
    },
    transcodingCompleted: { type: Boolean, default: false, index: true },
    kpis: {
      timings: { queueWait: Number, download: Number, transcode: Number, upload: Number, total: Number },
      sizes: { original: Number, '1080p': Number, '720p': Number, '480p': Number, '360p': Number, '240p': Number, total: Number },
    },
    masterPlaylistUrl: { type: String },
    outputs: [VideoOutputSchema],
    thumbnail: { type: String },
    thumbnails: [{ type: String }],
    duration: { type: Number },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    genres: [{ type: String, trim: true, maxlength: 50 }],
    contentType: { type: String, enum: ['vod', 'live', 'reel'], default: 'vod' },
    isLive: { type: Boolean, default: false, index: true },
    liveStatus: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'ended', index: true },
    liveIngestStatus: { type: String, enum: ['idle', 'connected', 'disconnected'], default: 'idle', index: true },
    liveScheduledAt: Date,
    liveStartedAt: Date,
    liveEndedAt: Date,
    streamKey: { type: String },
    isAdultContent: { type: Boolean, default: false },
    isDownloadable: { type: Boolean, default: false },
    showTitle: { type: Boolean, default: true },
    visibility: { type: String, enum: ['listed', 'unlisted'], default: 'unlisted', index: true },
    allowLikes: { type: Boolean, default: true },
    allowDislikes: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    viewCount:    { type: Number, default: 0, min: 0 },
    likeCount:    { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    retryCount: { type: Number, default: 0 },
    presignedUrlExpiresAt: { type: Date },
    webhookUrl: { type: String },
    webhookHeaders: { type: Map, of: String },
  },
  { timestamps: true }
);

VideoSchema.index({ userId: 1, status: 1 });
VideoSchema.index({ contentType: 1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ createdAt: -1 });
VideoSchema.index({ userId: 1, visibility: 1 });
VideoSchema.index({ isLive: 1, liveStatus: 1, createdAt: -1 });

export const Video = mongoose.model('Video', VideoSchema);
