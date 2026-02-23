import { Request, Response } from 'express';
import { EngagementService } from '../services/engagement.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';
import { emitEngagementUpdate } from '../../../shared/config/socket.js';

const engagementService = new EngagementService();

// Helper to emit updated engagement counts
const emitUpdatedCounts = async (videoId: string) => {
  try {
    const stats = await engagementService.getVideoEngagement(videoId);
    emitEngagementUpdate(videoId, stats);
  } catch {
    // Ignore errors - don't break the main request
  }
};

export class EngagementController {
  /**
   * Like a video
   */
  async likeVideo(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { videoId } = req.params;

      const result = await engagementService.likeVideo(userId, videoId);

      // Emit real-time update to all viewers
      emitUpdatedCounts(videoId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Like video error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to like video',
      });
    }
  }

  /**
   * Dislike a video
   */
  async dislikeVideo(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { videoId } = req.params;

      const result = await engagementService.dislikeVideo(userId, videoId);

      // Emit real-time update to all viewers
      emitUpdatedCounts(videoId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Dislike video error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to dislike video',
      });
    }
  }

  /**
   * Remove engagement (unlike/undislike)
   */
  async removeEngagement(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { videoId } = req.params;

      const result = await engagementService.removeEngagement(userId, videoId);

      // Emit real-time update to all viewers
      emitUpdatedCounts(videoId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Remove engagement error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to remove engagement',
      });
    }
  }

  /**
   * Get video engagement stats
   */
  async getVideoEngagement(req: Request, res: Response) {
    try {
      const { videoId } = req.params;

      const result = await engagementService.getVideoEngagement(videoId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Get video engagement error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to get engagement stats',
      });
    }
  }

  /**
   * Get user's engagement status on a video
   */
  async getUserEngagementStatus(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { videoId } = req.params;

      const result = await engagementService.getUserEngagementStatus(userId, videoId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Get user engagement status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get engagement status',
      });
    }
  }

  /**
   * Get user's liked videos
   */
  async getUserLikedVideos(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await engagementService.getUserLikedVideos(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ENGAGEMENT] Get liked videos error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get liked videos',
      });
    }
  }
}
