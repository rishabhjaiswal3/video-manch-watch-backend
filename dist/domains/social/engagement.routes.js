"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const engagement_controller_js_1 = require("./controllers/engagement.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
const engagementController = new engagement_controller_js_1.EngagementController();
/**
 * Public Routes
 */
// Get video engagement stats (likes/dislikes count)
router.get('/video/:videoId', (req, res) => engagementController.getVideoEngagement(req, res));
/**
 * Protected Routes
 */
// Like a video
router.post('/video/:videoId/like', auth_js_1.authenticate, (req, res) => engagementController.likeVideo(req, res));
// Dislike a video
router.post('/video/:videoId/dislike', auth_js_1.authenticate, (req, res) => engagementController.dislikeVideo(req, res));
// Remove engagement (unlike/undislike)
router.delete('/video/:videoId', auth_js_1.authenticate, (req, res) => engagementController.removeEngagement(req, res));
// Get user's engagement status on a video
router.get('/video/:videoId/status', auth_js_1.authenticate, (req, res) => engagementController.getUserEngagementStatus(req, res));
// Get user's liked videos
router.get('/user/liked', auth_js_1.authenticate, (req, res) => engagementController.getUserLikedVideos(req, res));
exports.default = router;
//# sourceMappingURL=engagement.routes.js.map