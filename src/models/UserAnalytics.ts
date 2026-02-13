import mongoose, { Schema, Document } from 'mongoose';

/**
 * User Watch History — Tracks EACH user's watch activity per video
 *
 * This answers questions like:
 *   - "How much has User X watched Video Y?"
 *   - "What is User X's total watch time across all videos?"
 *   - "Show me User X's recently watched videos"
 *   - "Which videos has User X watched more than 80%?"
 *   - "Don't recommend videos User X has already completed"
 *
 * One document per user×video pair. Updated by the analytics worker.
 */

export interface IUserWatchHistory extends Document {
    userId: string;
    videoId: string;

    // Watch time tracking
    totalWatchTime: number;         // Total seconds watched (cumulative across all sessions)
    lastWatchedPosition: number;    // Last known playback position (for "resume watching")
    maxWatchedPosition: number;     // Furthest point reached in the video

    // Completion tracking
    videoDuration: number;          // Video duration in seconds (updated each session)
    completionRate: number;         // Highest completion % achieved (0-100)
    isCompleted: boolean;           // True if user watched ≥90% of the video
    completedAt?: Date;             // When the user first completed the video

    // Session tracking
    totalSessions: number;          // How many times the user opened this video
    totalPlays: number;             // How many times play was initiated
    totalPauses: number;            // How many times the video was paused
    totalSeeks: number;             // How many times the user seeked

    // Quality info
    lastQuality: string;            // Last quality level watched

    // Video metadata (denormalized for fast queries)
    videoType?: string;             // 'video' | 'reel' | 'livestream'

    // Timestamps
    firstWatchedAt: Date;           // When the user first watched this video
    lastWatchedAt: Date;            // When the user last watched this video
    createdAt: Date;
    updatedAt: Date;
}

const UserWatchHistorySchema = new Schema<IUserWatchHistory>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        videoId: {
            type: String,
            required: true,
            index: true,
        },

        // Watch time
        totalWatchTime: { type: Number, default: 0 },
        lastWatchedPosition: { type: Number, default: 0 },
        maxWatchedPosition: { type: Number, default: 0 },

        // Completion
        videoDuration: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },

        // Session tracking
        totalSessions: { type: Number, default: 0 },
        totalPlays: { type: Number, default: 0 },
        totalPauses: { type: Number, default: 0 },
        totalSeeks: { type: Number, default: 0 },

        // Quality
        lastQuality: { type: String, default: 'auto' },

        // Metadata
        videoType: { type: String },

        // Timestamps
        firstWatchedAt: { type: Date, default: Date.now },
        lastWatchedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

// Compound index — one document per user×video pair (unique)
UserWatchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });

// Index for "recently watched" queries
UserWatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

// Index for "continue watching" queries (not completed, recently watched)
UserWatchHistorySchema.index({ userId: 1, isCompleted: 1, lastWatchedAt: -1 });

// Index for platform-wide stats
UserWatchHistorySchema.index({ videoId: 1, lastWatchedAt: -1 });

export const UserWatchHistory = mongoose.model<IUserWatchHistory>('UserWatchHistory', UserWatchHistorySchema);

/**
 * User Analytics Summary — Aggregated stats PER USER
 *
 * This answers:
 *   - "What is User X's total watch time?"
 *   - "How many videos has User X watched today?"
 *   - "What is User X's average session duration?"
 *
 * One document per user. Updated by the analytics worker.
 */

export interface IUserAnalyticsSummary extends Document {
    userId: string;

    // Totals (all time)
    totalWatchTime: number;         // Total seconds watched across all videos
    totalVideosWatched: number;     // Unique videos watched
    totalReelsWatched: number;      // Unique reels watched
    totalCompletedVideos: number;   // Videos watched ≥90%
    totalSessions: number;          // Total viewing sessions

    // Daily tracking
    todayWatchTime: number;         // Watch time today
    todayDate: string;              // YYYY-MM-DD — reset when day changes

    // Streaks
    lastActiveDate: string;         // YYYY-MM-DD of last activity
    currentStreak: number;          // Consecutive days of watching
    longestStreak: number;          // Longest ever consecutive viewing streak

    // Preferences (auto-learned)
    preferredQuality: string;       // Most used quality level
    avgSessionDuration: number;     // Average session length in seconds

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const UserAnalyticsSummarySchema = new Schema<IUserAnalyticsSummary>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Totals
        totalWatchTime: { type: Number, default: 0 },
        totalVideosWatched: { type: Number, default: 0 },
        totalReelsWatched: { type: Number, default: 0 },
        totalCompletedVideos: { type: Number, default: 0 },
        totalSessions: { type: Number, default: 0 },

        // Daily
        todayWatchTime: { type: Number, default: 0 },
        todayDate: { type: String, default: '' },

        // Streaks
        lastActiveDate: { type: String, default: '' },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },

        // Preferences
        preferredQuality: { type: String, default: 'auto' },
        avgSessionDuration: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

export const UserAnalyticsSummary = mongoose.model<IUserAnalyticsSummary>('UserAnalyticsSummary', UserAnalyticsSummarySchema);
