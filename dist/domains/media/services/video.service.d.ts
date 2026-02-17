export declare class VideoService {
    /**
     * List public videos (VOD/Live), excluding Reels by default
     */
    listVideos(params: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        videos: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get single video details
     */
    getVideoById(videoId: string): Promise<any>;
    /**
     * List Reels (vertical short videos)
     */
    listReels(params: {
        page: number;
        limit: number;
    }): Promise<{
        videos: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=video.service.d.ts.map