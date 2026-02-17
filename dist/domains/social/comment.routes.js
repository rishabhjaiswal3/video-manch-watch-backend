"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_js_1 = require("./controllers/comment.controller.js");
const validate_js_1 = require("../../middleware/validate.js");
const social_js_1 = require("../../schemas/social.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
const commentController = new comment_controller_js_1.CommentController();
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
router.post('/video/:videoId', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.createCommentSchema), (req, res) => commentController.addComment(req, res));
// Reply to a comment
router.post('/:commentId/reply', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.createCommentSchema), (req, res) => commentController.replyToComment(req, res));
// Edit a comment
router.patch('/:commentId', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.updateCommentSchema), (req, res) => commentController.editComment(req, res));
// Delete a comment
router.delete('/:commentId', auth_js_1.authenticate, (req, res) => commentController.deleteComment(req, res));
// Like a comment
router.post('/:commentId/like', auth_js_1.authenticate, (req, res) => commentController.likeComment(req, res));
// Unlike a comment
router.delete('/:commentId/like', auth_js_1.authenticate, (req, res) => commentController.unlikeComment(req, res));
exports.default = router;
//# sourceMappingURL=comment.routes.js.map