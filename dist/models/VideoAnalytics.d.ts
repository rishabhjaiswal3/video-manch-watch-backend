import mongoose, { Document } from 'mongoose';
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
    date: string;
    views: number;
    uniqueViewers: number;
    totalWatchTime: number;
    avgWatchTime: number;
    completions: number;
    avgCompletionRate: number;
    qualityStats: {
        '1080p': number;
        '720p': number;
        '480p': number;
        '360p': number;
        'auto': number;
    };
    totalPlays: number;
    totalPauses: number;
    totalSeeks: number;
    bufferingEvents: number;
    errorCount: number;
    peakConcurrent: number;
    sessions: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const VideoAnalytics: mongoose.Model<IVideoAnalytics, {}, {}, {}, mongoose.Document<unknown, {}, IVideoAnalytics, {}, {}> & IVideoAnalytics & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
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
export declare const ActiveSession: mongoose.Model<IActiveSession, {}, {}, {}, mongoose.Document<unknown, {}, IActiveSession, {}, {}> & IActiveSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=VideoAnalytics.d.ts.map