import { Router } from 'express';
import { CommentController } from './controllers/comment.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { createCommentSchema, updateCommentSchema } from '../../shared/schemas/social.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
const commentController = new CommentController();

/**
 * Public Routes
 */
// Get video comments (with optional auth for like status)
router.get('/video/:videoId', (req, res) => commentController.getVideoComments(req, res));

// Get replies to a comment
router.get('/:commentId/replies', (req, res) => commentController.getCommentReplies(req, res));

/**
 * Protected Routes
 */
// Add a comment to a video
router.post('/video/:videoId', authenticate, validate(createCommentSchema), (req, res) =>
  commentController.addComment(req, res)
);

// Reply to a comment
router.post('/:commentId/reply', authenticate, validate(createCommentSchema), (req, res) =>
  commentController.replyToComment(req, res)
);

// Edit a comment
router.patch('/:commentId', authenticate, validate(updateCommentSchema), (req, res) =>
  commentController.editComment(req, res)
);

// Delete a comment
router.delete('/:commentId', authenticate, (req, res) =>
  commentController.deleteComment(req, res)
);

// Like a comment
router.post('/:commentId/like', authenticate, (req, res) =>
  commentController.likeComment(req, res)
);

// Unlike a comment
router.delete('/:commentId/like', authenticate, (req, res) =>
  commentController.unlikeComment(req, res)
);

export default router;
