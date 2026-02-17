import { Router } from 'express';
import { EngagementController } from './controllers/engagement.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const engagementController = new EngagementController();

/**
 * Public Routes
 */
// Get video engagement stats (likes/dislikes count)
router.get('/video/:videoId', (req, res) => engagementController.getVideoEngagement(req, res));

/**
 * Protected Routes
 */
// Like a video
router.post('/video/:videoId/like', authenticate, (req, res) =>
  engagementController.likeVideo(req, res)
);

// Dislike a video
router.post('/video/:videoId/dislike', authenticate, (req, res) =>
  engagementController.dislikeVideo(req, res)
);

// Remove engagement (unlike/undislike)
router.delete('/video/:videoId', authenticate, (req, res) =>
  engagementController.removeEngagement(req, res)
);

// Get user's engagement status on a video
router.get('/video/:videoId/status', authenticate, (req, res) =>
  engagementController.getUserEngagementStatus(req, res)
);

// Get user's liked videos
router.get('/user/liked', authenticate, (req, res) =>
  engagementController.getUserLikedVideos(req, res)
);

export default router;
