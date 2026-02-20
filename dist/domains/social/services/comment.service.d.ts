export declare class CommentService {
    /**
     * Get comments for a video
     */
    getVideoComments(videoId: string, page?: number, limit?: number): Promise<{
        comments: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Add a comment to a video
     */
    addComment(userId: string, videoId: string, content: string): Promise<any>;
    /**
     * Get replies to a comment
     */
    getCommentReplies(commentId: string, page?: number, limit?: number): Promise<{
        replies: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Reply to a comment
     */
    replyToComment(userId: string, parentCommentId: string, content: string): Promise<any>;
    /**
     * Edit a comment
     */
    editComment(userId: string, commentId: string, content: string): Promise<any>;
    /**
     * Delete a comment (soft delete)
     */
    deleteComment(userId: string, commentId: string): Promise<{
        deleted: boolean;
        videoId?: string;
        parentId?: string | null;
    }>;
    /**
     * Like a comment
     */
    likeComment(userId: string, commentId: string): Promise<{
        liked: boolean;
        isNew: boolean;
    }>;
    /**
     * Unlike a comment
     */
    unlikeComment(userId: string, commentId: string): Promise<{
        unliked: boolean;
    }>;
    /**
     * Check if user has liked a comment
     */
    hasUserLikedComment(userId: string, commentId: string): Promise<boolean>;
    /**
     * Get comments with user's like status
     */
    getVideoCommentsWithLikeStatus(videoId: string, userId: string | null, page?: number, limit?: number): Promise<{
        comments: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=comment.service.d.ts.map