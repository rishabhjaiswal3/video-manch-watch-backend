import { Request, Response } from 'express';
export declare class EngagementController {
    /**
     * Like a video
     */
    likeVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Dislike a video
     */
    dislikeVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Remove engagement (unlike/undislike)
     */
    removeEngagement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get video engagement stats
     */
    getVideoEngagement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get user's engagement status on a video
     */
    getUserEngagementStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get user's liked videos
     */
    getUserLikedVideos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=engagement.controller.d.ts.map