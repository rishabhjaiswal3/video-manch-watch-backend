interface RegisterVODInput {
    userId: string;
    userType: 'user' | 'creator';
    title: string;
    description?: string;
    category?: string;
    masterPlaylistUrl: string;
    thumbnail?: string;
    duration?: number;
    contentType?: 'vod' | 'reel' | 'live';
    source?: string;
    sourceStreamId?: string;
}
export declare class VideoService {
    /**
     * Register a VOD entry created from live recording.
     */
    registerVOD(input: RegisterVODInput): Promise<{
        videoId: string;
    }>;
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
export {};
//# sourceMappingURL=video.service.d.ts.map