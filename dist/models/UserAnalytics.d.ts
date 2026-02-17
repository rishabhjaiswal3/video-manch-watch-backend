import mongoose, { Document } from 'mongoose';
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
    totalWatchTime: number;
    lastWatchedPosition: number;
    maxWatchedPosition: number;
    videoDuration: number;
    completionRate: number;
    isCompleted: boolean;
    completedAt?: Date;
    totalSessions: number;
    totalPlays: number;
    totalPauses: number;
    totalSeeks: number;
    lastQuality: string;
    videoType?: string;
    firstWatchedAt: Date;
    lastWatchedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserWatchHistory: mongoose.Model<IUserWatchHistory, {}, {}, {}, mongoose.Document<unknown, {}, IUserWatchHistory, {}, {}> & IUserWatchHistory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
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
    totalWatchTime: number;
    totalVideosWatched: number;
    totalReelsWatched: number;
    totalCompletedVideos: number;
    totalSessions: number;
    todayWatchTime: number;
    todayDate: string;
    lastActiveDate: string;
    currentStreak: number;
    longestStreak: number;
    preferredQuality: string;
    avgSessionDuration: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserAnalyticsSummary: mongoose.Model<IUserAnalyticsSummary, {}, {}, {}, mongoose.Document<unknown, {}, IUserAnalyticsSummary, {}, {}> & IUserAnalyticsSummary & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=UserAnalytics.d.ts.map