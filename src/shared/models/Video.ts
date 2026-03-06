import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoOutput {
  quality: string;
  r2Key: string;
  url?: string;
  size?: number;
  playlistUrl?: string;      // HLS playlist URL
  segmentCount?: number;     // Number of HLS segments
}

export interface IVideo extends Document {
  videoId: string;
  userId: string;
  userType: 'user' | 'creator';
  title: string;
  description?: string;

  // Original file info
  originalFile: {
    filename: string;
    size: number;
    mimeType: string;
    r2Key: string;
  };

  // Original video metadata (from FFprobe)
  originalMetadata?: {
    width: number;
    height: number;
    duration: number;
    codec?: string;
    bitrate?: number;
    fps?: number;
  };

  // Processing status
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'deleted';
  statusHistory?: Array<{
    from: IVideo['status'];
    to: IVideo['status'];
    at: Date;
    reason?: string;
  }>;

  // Transcoding info
  transcoding?: {
    jobId?: string;
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  };

  // Transcoding completed flag
  transcodingCompleted?: boolean;

  // Performance metrics (KPIs)
  kpis?: {
    timings: {
      queueWait?: number;      // Time in queue (ms)
      download?: number;        // Download time (ms)
      transcode?: number;       // Transcoding time (ms)
      upload?: number;          // Upload time (ms)
      total?: number;           // Total processing time (ms)
    };
    sizes: {
      original?: number;        // Original file size
      '1080p'?: number;
      '720p'?: number;
      '480p'?: number;
      '360p'?: number;
      '240p'?: number;
      total?: number;           // Total transcoded size
    };
  };

  // HLS master playlist
  masterPlaylistUrl?: string;

  // Outputs (quality variants)
  outputs: IVideoOutput[];

  // Thumbnails (multiple for selection)
  thumbnail?: string;              // Primary thumbnail
  thumbnails?: string[];           // All generated thumbnails

  // Video duration
  duration?: number;

  // Content categorization
  tags?: string[];                 // User-defined tags
  genres?: string[];               // Content genres

  // Live stream state
  isLive?: boolean;
  liveStatus?: 'scheduled' | 'live' | 'ended';
  liveStartedAt?: Date;
  liveEndedAt?: Date;
  streamKey?: string;

  // Content flags
  contentType?: 'vod' | 'live' | 'reel';
  isAdultContent?: boolean;
  isDownloadable?: boolean;
  showTitle?: boolean;

  // Visibility (creator can make listed or keep unlisted)
  visibility?: 'listed' | 'unlisted';

  // Engagement controls (creator can toggle on/off)
  allowLikes?: boolean;
  allowDislikes?: boolean;
  allowComments?: boolean;

  // Engagement counters (denormalized for performance)
  likeCount?: number;
  dislikeCount?: number;
  commentCount?: number;

  // Retry tracking
  retryCount?: number;

  // Presigned URL tracking
  presignedUrlExpiresAt?: Date;

  // Webhook for completion notification
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const VideoOutputSchema = new Schema<IVideoOutput>({
  quality: { type: String, required: true },
  r2Key: { type: String },   // Optional — HLS outputs use playlistUrl instead
  url: { type: String },
  size: { type: Number },
  playlistUrl: { type: String },
  segmentCount: { type: Number },
});

const VideoSchema = new Schema<IVideo>(
  {
    videoId: {
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
    userType: {
      type: String,
      enum: ['user', 'creator'],
      default: 'user',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    originalFile: {
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
      r2Key: { type: String, required: true },
    },

    // Original video metadata
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
    statusHistory: [
      {
        from: { type: String },
        to: { type: String },
        at: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
    transcoding: {
      jobId: { type: String },
      progress: { type: Number, default: 0 },
      startedAt: { type: Date },
      completedAt: { type: Date },
      error: { type: String },
    },
    transcodingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Performance metrics
    kpis: {
      timings: {
        queueWait: { type: Number },
        download: { type: Number },
        transcode: { type: Number },
        upload: { type: Number },
        total: { type: Number },
      },
      sizes: {
        original: { type: Number },
        '1080p': { type: Number },
        '720p': { type: Number },
        '480p': { type: Number },
        '360p': { type: Number },
        '240p': { type: Number },
        total: { type: Number },
      },
    },

    // HLS
    masterPlaylistUrl: { type: String },
    outputs: [VideoOutputSchema],

    // Thumbnails
    thumbnail: { type: String },
    thumbnails: [{ type: String }],

    duration: { type: Number },

    // Categorization
    tags: [{ type: String, trim: true, maxlength: 50 }],
    genres: [{ type: String, trim: true, maxlength: 50 }],

    // Content flags
    contentType: {
      type: String,
      enum: ['vod', 'live', 'reel'],
      default: 'vod',
    },
    isLive: { type: Boolean, default: false, index: true },
    liveStatus: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'ended',
      index: true,
    },
    liveStartedAt: { type: Date },
    liveEndedAt: { type: Date },
    streamKey: { type: String },
    isAdultContent: { type: Boolean, default: false },
    isDownloadable: { type: Boolean, default: false },
    showTitle: { type: Boolean, default: true },

    // Visibility
    visibility: {
      type: String,
      enum: ['listed', 'unlisted'],
      default: 'unlisted',
      index: true,
    },

    // Engagement controls
    allowLikes: { type: Boolean, default: true },
    allowDislikes: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },

    // Engagement counters
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },

    // Retry tracking
    retryCount: { type: Number, default: 0 },

    // Presigned URL tracking
    presignedUrlExpiresAt: { type: Date },

    // Webhook
    webhookUrl: { type: String },
    webhookHeaders: { type: Map, of: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
VideoSchema.index({ userId: 1, status: 1 });
VideoSchema.index({ contentType: 1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ genres: 1 });
VideoSchema.index({ createdAt: -1 });
VideoSchema.index({ userId: 1, visibility: 1 });
VideoSchema.index({ isLive: 1, liveStatus: 1, createdAt: -1 });

export const Video = mongoose.model<IVideo>('Video', VideoSchema);
