import mongoose, { Schema, Document } from 'mongoose';

export type LiveStreamStatus = 'created' | 'ready' | 'live' | 'ended' | 'failed';

export interface ILiveStream extends Document {
  streamId: string;
  userId: string;
  userType: 'user' | 'creator';

  // Stream metadata
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];

  // Stream credentials (private - never exposed in list queries)
  streamKey: string;

  // RTMP ingest info
  rtmpUrl: string;

  // Playback URLs
  playbackUrl?: string;
  playbackR2Key?: string;

  // Status
  status: LiveStreamStatus;
  statusHistory?: Array<{
    from: LiveStreamStatus;
    to: LiveStreamStatus;
    at: Date;
    reason?: string;
  }>;

  // Metrics
  viewerCount: number;
  peakViewers: number;
  totalViews: number;

  // Timing
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;

  // Settings
  recordingEnabled: boolean;
  recordedVideoId?: string;
  chatEnabled: boolean;
  isAdultContent: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LiveStreamSchema = new Schema<ILiveStream>(
  {
    streamId: {
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
      default: 'creator',
    },

    // Stream metadata
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
    thumbnail: {
      type: String,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],

    // Stream credentials
    streamKey: {
      type: String,
      required: true,
      index: true,
    },

    // RTMP ingest
    rtmpUrl: {
      type: String,
      required: true,
    },

    // Playback
    playbackUrl: {
      type: String,
    },
    playbackR2Key: {
      type: String,
    },

    // Status
    status: {
      type: String,
      enum: ['created', 'ready', 'live', 'ended', 'failed'],
      default: 'created',
      index: true,
    },
    statusHistory: [{
      from: { type: String },
      to: { type: String },
      at: { type: Date, default: Date.now },
      reason: { type: String },
    }],

    // Metrics
    viewerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    peakViewers: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Timing
    scheduledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },

    // Settings
    recordingEnabled: {
      type: Boolean,
      default: true,
    },
    recordedVideoId: {
      type: String,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    isAdultContent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for query patterns
LiveStreamSchema.index({ userId: 1, status: 1 });
LiveStreamSchema.index({ status: 1, createdAt: -1 });
LiveStreamSchema.index({ category: 1, status: 1 });
LiveStreamSchema.index({ createdAt: -1 });
LiveStreamSchema.index({ startedAt: -1 });

export const LiveStream = mongoose.model<ILiveStream>('LiveStream', LiveStreamSchema);
