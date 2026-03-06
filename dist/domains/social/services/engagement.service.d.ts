export declare class EngagementService {
    /**
     * Like a video
     */
    likeVideo(userId: string, videoId: string): Promise<{
        type: 'like';
        isNew: boolean;
    }>;
    /**
     * Dislike a video
     */
    dislikeVideo(userId: string, videoId: string): Promise<{
        type: 'dislike';
        isNew: boolean;
    }>;
    /**
     * Remove engagement (unlike/undislike)
     */
    removeEngagement(userId: string, videoId: string): Promise<{
        removed: boolean;
        previousType?: string;
    }>;
    /**
     * Get video engagement stats
     */
    getVideoEngagement(videoId: string): Promise<{
        likeCount: number;
        dislikeCount: number;
    }>;
    /**
     * Get user's engagement status on a video
     */
    getUserEngagementStatus(userId: string, videoId: string): Promise<{
        engaged: boolean;
        type?: 'like' | 'dislike';
    }>;
    /**
     * Get user's liked videos
     */
    getUserLikedVideos(userId: string, page?: number, limit?: number): Promise<{
        videos: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=engagement.service.d.ts.map