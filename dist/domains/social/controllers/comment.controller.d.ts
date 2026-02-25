import { Request, Response } from 'express';
export declare class CommentController {
    /**
     * Get video comments
     */
    getVideoComments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Add a comment to a video
     */
    addComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get replies to a comment
     */
    getCommentReplies(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Reply to a comment
     */
    replyToComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Edit a comment
     */
    editComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete a comment
     */
    deleteComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Like a comment
     */
    likeComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Unlike a comment
     */
    unlikeComment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=comment.controller.d.ts.map