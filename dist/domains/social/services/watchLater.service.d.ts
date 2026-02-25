export declare class WatchLaterService {
    /** Add a video to the user's watch later list */
    add(userId: string, videoId: string): Promise<{
        added: boolean;
        alreadyExists: boolean;
    }>;
    /** Remove a video from watch later */
    remove(userId: string, videoId: string): Promise<{
        removed: boolean;
    }>;
    /** Get all watch later videos for a user (paginated), joined with video data */
    getList(userId: string, page: number, limit: number): Promise<{
        videos: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /** Check if a video is in the user's watch later */
    getStatus(userId: string, videoId: string): Promise<{
        saved: boolean;
    }>;
}
//# sourceMappingURL=watchLater.service.d.ts.map