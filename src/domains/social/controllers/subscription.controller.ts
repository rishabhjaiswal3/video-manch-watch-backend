import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
  /**
   * Subscribe to a creator
   */
  async subscribe(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { creatorId } = req.params;

      const result = await subscriptionService.subscribe(userId, creatorId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Subscribe error:', error);

      if (error.message === 'Cannot subscribe to yourself') {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === 'Creator not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to subscribe',
      });
    }
  }

  /**
   * Unsubscribe from a creator
   */
  async unsubscribe(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { creatorId } = req.params;

      const result = await subscriptionService.unsubscribe(userId, creatorId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Unsubscribe error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe',
      });
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { creatorId } = req.params;

      const result = await subscriptionService.getSubscriptionStatus(userId, creatorId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Get status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get subscription status',
      });
    }
  }

  /**
   * Toggle notifications
   */
  async toggleNotifications(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { creatorId } = req.params;
      const { enabled } = req.body;

      const result = await subscriptionService.toggleNotifications(userId, creatorId, enabled);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Toggle notifications error:', error);

      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to toggle notifications',
      });
    }
  }

  /**
   * Get channels the user is following
   */
  async getFollowing(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await subscriptionService.getFollowing(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Get following error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get following',
      });
    }
  }

  /**
   * Get user's subscribers (for creators)
   */
  async getSubscribers(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await subscriptionService.getSubscribers(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Get subscribers error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get subscribers',
      });
    }
  }
}
