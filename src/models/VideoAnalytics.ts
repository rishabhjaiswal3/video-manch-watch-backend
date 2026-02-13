import mongoose, { Schema, Document } from 'mongoose';

/**
 * Playback Event - Individual event from player
 */
export interface IPlaybackEvent {
    type: 'play' | 'pause' | 'seek' | 'quality_change' | 'buffer' | 'ended' | 'error' | 'heartbeat' | 'watchtime';
    videoId: string;
    userId?: string;
    sessionId: string;
    timestamp: number;
    data: {
        currentTime?: number;
        duration?: number;
        quality?: string;
        volume?: number;
        muted?: boolean;
        buffered?: number;
        playbackRate?: number;
        previousQuality?: string;
        seekFrom?: number;
        seekTo?: number;
        errorCode?: number;
        errorMessage?: string;
        watchTime?: number;
        completionRate?: number;
        videoType?: string;
    };
}

/**
 * Video Analytics - Aggregated stats per video per day
 */
export interface IVideoAnalytics extends Document {
    videoId: string;
    date: string;  // YYYY-MM-DD format

    // View counts
    views: number;
    uniqueViewers: number;

    // Watch time (in seconds)
    totalWatchTime: number;
    avgWatchTime: number;

    // Completion
    completions: number;  // Number of viewers who watched 90%+
    avgCompletionRate: number;

    // Quality distribution
    qualityStats: {
        '1080p': number;
        '720p': number;
        '480p': number;
        '360p': number;
        'auto': number;
    };

    // Engagement
    totalPlays: number;
    totalPauses: number;
    totalSeeks: number;
    bufferingEvents: number;
    errorCount: number;

    // Peak concurrent viewers (updated in real-time)
    peakConcurrent: number;

    // Session tracking
    sessions: string[];  // Unique session IDs

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const VideoAnalyticsSchema = new Schema<IVideoAnalytics>(
    {
        videoId: {
            type: String,
            required: true,
            index: true,
        },
        date: {
            type: String,
            required: true,
            index: true,
        },

        // View counts
        views: { type: Number, default: 0 },
        uniqueViewers: { type: Number, default: 0 },

        // Watch time
        totalWatchTime: { type: Number, default: 0 },
        avgWatchTime: { type: Number, default: 0 },

        // Completion
        completions: { type: Number, default: 0 },
        avgCompletionRate: { type: Number, default: 0 },

        // Quality distribution
        qualityStats: {
            '1080p': { type: Number, default: 0 },
            '720p': { type: Number, default: 0 },
            '480p': { type: Number, default: 0 },
            '360p': { type: Number, default: 0 },
            'auto': { type: Number, default: 0 },
        },

        // Engagement
        totalPlays: { type: Number, default: 0 },
        totalPauses: { type: Number, default: 0 },
        totalSeeks: { type: Number, default: 0 },
        bufferingEvents: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },

        // Peak concurrent
        peakConcurrent: { type: Number, default: 0 },

        // Sessions
        sessions: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
VideoAnalyticsSchema.index({ videoId: 1, date: -1 });
VideoAnalyticsSchema.index({ date: -1 });

export const VideoAnalytics = mongoose.model<IVideoAnalytics>('VideoAnalytics', VideoAnalyticsSchema);

/**
 * Real-time session tracking
 * Tracks active viewing sessions for concurrent viewer count
 */
export interface IActiveSession extends Document {
    sessionId: string;
    videoId: string;
    userId?: string;
    startedAt: Date;
    lastHeartbeat: Date;
    quality: string;
    watchTime: number;
    currentTime: number;
}

const ActiveSessionSchema = new Schema<IActiveSession>(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        videoId: {
            type: String,
            required: true,
            index: true,
        },
        userId: { type: String },
        startedAt: { type: Date, default: Date.now },
        lastHeartbeat: { type: Date, default: Date.now },
        quality: { type: String, default: 'auto' },
        watchTime: { type: Number, default: 0 },
        currentTime: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

// TTL index - automatically delete sessions after no heartbeat
// Note: This value (120 seconds) is set at index creation time.
// To change: 1) Update ANALYTICS_SESSION_TTL_SECONDS in .env
// 2) Drop the existing index in MongoDB: db.activesessions.dropIndex("lastHeartbeat_1")
// 3) Restart the server to recreate with new TTL
// Default: 120 seconds (2 minutes)
const SESSION_TTL_SECONDS = parseInt(process.env.ANALYTICS_SESSION_TTL_SECONDS || '120', 10);
ActiveSessionSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });

export const ActiveSession = mongoose.model<IActiveSession>('ActiveSession', ActiveSessionSchema);
