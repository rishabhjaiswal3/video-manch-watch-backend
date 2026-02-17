import { Router } from 'express';
import { SubscriptionController } from './controllers/subscription.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateNotificationSchema } from '../../schemas/social.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const subscriptionController = new SubscriptionController();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Specific routes (must come before dynamic :creatorId routes)
 */
// Get channels the user is following
router.get('/my/following', (req, res) => subscriptionController.getFollowing(req, res));

// Get user's subscribers (for creators)
router.get('/my/subscribers', (req, res) => subscriptionController.getSubscribers(req, res));

/**
 * Dynamic routes
 */
// Subscribe to a creator
router.post('/:creatorId', (req, res) => subscriptionController.subscribe(req, res));

// Unsubscribe from a creator
router.delete('/:creatorId', (req, res) => subscriptionController.unsubscribe(req, res));

// Get subscription status
router.get('/:creatorId/status', (req, res) => subscriptionController.getSubscriptionStatus(req, res));

// Toggle notifications
router.patch('/:creatorId/notifications', validate(updateNotificationSchema), (req, res) =>
  subscriptionController.toggleNotifications(req, res)
);

export default router;
