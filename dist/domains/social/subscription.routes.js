"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_js_1 = require("./controllers/subscription.controller.js");
const validate_js_1 = require("../../shared/middleware/validate.js");
const social_js_1 = require("../../shared/schemas/social.js");
const auth_js_1 = require("../../shared/middleware/auth.js");
const router = (0, express_1.Router)();
const subscriptionController = new subscription_controller_js_1.SubscriptionController();
/**
 * All routes require authentication
 */
router.use(auth_js_1.authenticate);
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
router.patch('/:creatorId/notifications', (0, validate_js_1.validate)(social_js_1.updateNotificationSchema), (req, res) => subscriptionController.toggleNotifications(req, res));
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map