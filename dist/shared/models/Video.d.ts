import mongoose, { Document } from 'mongoose';
export interface IVideoOutput {
    quality: string;
    r2Key: string;
    url?: string;
    size?: number;
    playlistUrl?: string;
    segmentCount?: number;
}
export interface IVideo extends Document {
    videoId: string;
    userId: string;
    userType: 'user' | 'creator';
    title: string;
    description?: string;
    originalFile: {
        filename: string;
        size: number;
        mimeType: string;
        r2Key: string;
    };
    originalMetadata?: {
        width: number;
        height: number;
        duration: number;
        codec?: string;
        bitrate?: number;
        fps?: number;
    };
    status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'deleted';
    statusHistory?: Array<{
        from: IVideo['status'];
        to: IVideo['status'];
        at: Date;
        reason?: string;
    }>;
    transcoding?: {
        jobId?: string;
        progress: number;
        startedAt?: Date;
        completedAt?: Date;
        error?: string;
    };
    transcodingCompleted?: boolean;
    kpis?: {
        timings: {
            queueWait?: number;
            download?: number;
            transcode?: number;
            upload?: number;
            total?: number;
        };
        sizes: {
            original?: number;
            '1080p'?: number;
            '720p'?: number;
            '480p'?: number;
            '360p'?: number;
            '240p'?: number;
            total?: number;
        };
    };
    masterPlaylistUrl?: string;
    outputs: IVideoOutput[];
    thumbnail?: string;
    thumbnails?: string[];
    duration?: number;
    tags?: string[];
    genres?: string[];
    isLive?: boolean;
    liveStatus?: 'scheduled' | 'live' | 'ended';
    liveStartedAt?: Date;
    liveEndedAt?: Date;
    streamKey?: string;
    contentType?: 'vod' | 'live' | 'reel';
    isAdultContent?: boolean;
    isDownloadable?: boolean;
    showTitle?: boolean;
    visibility?: 'listed' | 'unlisted';
    allowLikes?: boolean;
    allowDislikes?: boolean;
    allowComments?: boolean;
    likeCount?: number;
    dislikeCount?: number;
    commentCount?: number;
    retryCount?: number;
    presignedUrlExpiresAt?: Date;
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Video: mongoose.Model<IVideo, {}, {}, {}, mongoose.Document<unknown, {}, IVideo, {}, {}> & IVideo & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Video.d.ts.map