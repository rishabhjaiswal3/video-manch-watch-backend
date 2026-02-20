import mongoose, { Document } from 'mongoose';
export type LiveStreamStatus = 'created' | 'ready' | 'live' | 'ended' | 'failed';
export interface ILiveStream extends Document {
    streamId: string;
    userId: string;
    userType: 'user' | 'creator';
    title: string;
    description?: string;
    thumbnail?: string;
    category?: string;
    tags?: string[];
    streamKey: string;
    rtmpUrl: string;
    playbackUrl?: string;
    playbackR2Key?: string;
    status: LiveStreamStatus;
    statusHistory?: Array<{
        from: LiveStreamStatus;
        to: LiveStreamStatus;
        at: Date;
        reason?: string;
    }>;
    viewerCount: number;
    peakViewers: number;
    totalViews: number;
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
    recordingEnabled: boolean;
    recordedVideoId?: string;
    chatEnabled: boolean;
    isAdultContent: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const LiveStream: mongoose.Model<ILiveStream, {}, {}, {}, mongoose.Document<unknown, {}, ILiveStream, {}, {}> & ILiveStream & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=LiveStream.d.ts.map