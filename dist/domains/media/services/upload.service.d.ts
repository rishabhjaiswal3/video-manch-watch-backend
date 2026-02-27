export declare class UploadService {
    private enforceUserActiveUploadQuota;
    initializeUploadBatch(userId: string, userType: 'user' | 'creator' | 'admin', items: Array<{
        clientId?: string;
        filename: string;
        fileSize: number;
        mimeType: string;
        title: string;
        description?: string;
        contentType?: string;
        videoId?: string;
        tags?: string[];
    }>): Promise<{
        results: {
            clientId?: string;
            success: boolean;
            data?: {
                videoId: string;
                uploadUrl: string;
                r2Key: string;
                expiresIn: number;
            };
            error?: string;
        }[];
    }>;
    /**
     * Helper: Update status with history
     */
    private setStatusWithHistory;
    /**
     * Initialize Upload
     */
    initializeUpload(userId: string, userType: 'user' | 'creator' | 'admin', data: {
        filename: string;
        fileSize: number;
        mimeType: string;
        title: string;
        description?: string;
        contentType?: string;
        videoId?: string;
        tags?: string[];
    }, options?: {
        skipQuotaCheck?: boolean;
    }): Promise<{
        videoId: string;
        uploadUrl: string;
        r2Key: string;
        expiresIn: number;
    }>;
    /**
     * Complete Upload
     */
    completeUpload(userId: string, videoId: string): Promise<{
        videoId: string;
        status: "pending";
        jobId: string;
        message: string;
    }>;
    /**
     * Get Status
     */
    getStatus(userId: string, videoId: string): Promise<{
        videoId: string;
        title: string;
        status: "pending" | "uploading" | "queued" | "processing" | "completed" | "failed" | "deleted";
        transcoding: {
            progress: number;
            startedAt: Date | undefined;
            completedAt: Date | undefined;
            error: string | undefined;
        };
        jobStatus: {
            id: string | undefined;
            state: "unknown" | import("bullmq").JobState;
            progress: import("bullmq").JobProgress;
            data: import("../../../infra/queue/queueService.js").TranscodeJobData;
            failedReason: string;
            processedOn: number | undefined;
            finishedOn: number | undefined;
        } | null;
        outputs: import("../../../shared/models/Video.js").IVideoOutput[];
        thumbnail: string | undefined;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    /**
     * List Creator's Videos
     */
    listCreatorVideos(userId: string, params: {
        page: number;
        limit: number;
        status?: string;
        contentType?: string;
    }): Promise<{
        videos: {
            videoId: string;
            title: string;
            description: string | undefined;
            tags: string[] | undefined;
            status: "pending" | "uploading" | "queued" | "processing" | "completed" | "failed" | "deleted";
            thumbnail: string | undefined;
            duration: number | undefined;
            outputs: import("mongoose").FlattenMaps<import("../../../shared/models/Video.js").IVideoOutput>[];
            masterPlaylistUrl: string | undefined;
            contentType: "vod" | "live" | "reel";
            isDownloadable: boolean;
            isAdultContent: boolean;
            allowLikes: any;
            allowDislikes: any;
            allowComments: any;
            visibility: any;
            transcoding: {
                progress: number;
                error: string | undefined;
            };
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get Queue Stats
     */
    getQueueStats(): Promise<{
        data: unknown;
        cached: boolean;
    }>;
    /**
     * Retry Transcoding
     */
    retryTranscoding(userId: string, videoId: string): Promise<{
        videoId: string;
        status: string;
        jobId: string;
        message: string;
    }>;
    /**
     * Get Raw URL
     */
    getRawUrl(userId: string, videoId: string): Promise<{
        videoId: string;
        rawUrl: string;
        expiresIn: number;
        filename: string;
        mimeType: string;
    }>;
    /**
     * Get thumbnail presigned upload URL
     */
    getThumbnailUploadUrl(userId: string, videoId: string, mimeType: string): Promise<{
        uploadUrl: string;
        thumbnailKey: string;
        expiresIn: number;
    }>;
    /**
     * Update Video
     *
     * Uses findOneAndUpdate with $set to avoid full-document re-validation,
     * which would fail on the outputs[] sub-schema (r2Key required) even though
     * we are not touching the outputs array at all.
     */
    updateVideo(userId: string, videoId: string, updates: {
        title?: string;
        description?: string;
        tags?: string[];
        contentType?: 'vod' | 'reel' | 'live';
        thumbnail?: string;
        isDownloadable?: boolean;
        isAdultContent?: boolean;
        allowLikes?: boolean;
        allowDislikes?: boolean;
        allowComments?: boolean;
        visibility?: 'listed' | 'unlisted';
    }): Promise<{
        videoId: string;
        title: string;
        description: string | undefined;
        tags: string[] | undefined;
        contentType: "vod" | "live" | "reel" | undefined;
        thumbnail: string | undefined;
        isDownloadable: boolean | undefined;
        isAdultContent: boolean | undefined;
        allowLikes: any;
        allowDislikes: any;
        allowComments: any;
        visibility: any;
        status: "pending" | "uploading" | "queued" | "processing" | "completed" | "failed" | "deleted";
        updatedAt: Date;
    }>;
    /**
     * Delete Video
     */
    deleteVideo(userId: string, videoId: string): Promise<{
        videoId: string;
        status: string;
        message: string;
    }>;
}
//# sourceMappingURL=upload.service.d.ts.map