import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service.js';
import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';

const commentService = new CommentService();

export class CommentController {
  /**
   * Get video comments
   */
  async getVideoComments(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Check if user is authenticated (optional)
      let userId: string | null = null;
      try {
        const user = ensureAuthenticatedUser(req);
        userId = user.userId;
      } catch {
        // User not authenticated, that's fine
      }

      const result = userId
        ? await commentService.getVideoCommentsWithLikeStatus(videoId, userId, page, limit)
        : await commentService.getVideoComments(videoId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[COMMENT] Get video comments error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get comments',
      });
    }
  }

  /**
   * Add a comment to a video
   */
  async addComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { videoId } = req.params;
      const { content } = req.body;

      const comment = await commentService.addComment(userId, videoId, content);

      return res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      console.error('[COMMENT] Add comment error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to add comment',
      });
    }
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await commentService.getCommentReplies(commentId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[COMMENT] Get replies error:', error);

      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to get replies',
      });
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { commentId } = req.params;
      const { content } = req.body;

      const reply = await commentService.replyToComment(userId, commentId, content);

      return res.status(201).json({
        success: true,
        data: reply,
      });
    } catch (error: any) {
      console.error('[COMMENT] Reply to comment error:', error);

      if (error.message === 'Parent comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('deleted')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to reply to comment',
      });
    }
  }

  /**
   * Edit a comment
   */
  async editComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { commentId } = req.params;
      const { content } = req.body;

      const comment = await commentService.editComment(userId, commentId, content);

      return res.status(200).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      console.error('[COMMENT] Edit comment error:', error);

      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own comments',
        });
      }

      if (error.message.includes('deleted')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to edit comment',
      });
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { commentId } = req.params;

      const result = await commentService.deleteComment(userId, commentId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[COMMENT] Delete comment error:', error);

      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own comments',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete comment',
      });
    }
  }

  /**
   * Like a comment
   */
  async likeComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { commentId } = req.params;

      const result = await commentService.likeComment(userId, commentId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[COMMENT] Like comment error:', error);

      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('deleted')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to like comment',
      });
    }
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { commentId } = req.params;

      const result = await commentService.unlikeComment(userId, commentId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[COMMENT] Unlike comment error:', error);

      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to unlike comment',
      });
    }
  }
}
