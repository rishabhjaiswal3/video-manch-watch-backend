"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const live_controller_js_1 = require("./controllers/live.controller.js");
const validate_js_1 = require("../../middleware/validate.js");
const live_js_1 = require("../../schemas/live.js");
const auth_js_1 = require("../../middleware/auth.js");
const rateLimiter_js_1 = require("../../middleware/rateLimiter.js");
const router = (0, express_1.Router)();
const liveController = new live_controller_js_1.LiveController();
// ========================
// Public Routes
// ========================
// Get active live streams
router.get('/streams', (req, res) => liveController.getActiveStreams(req, res));
// Get stream details
router.get('/:streamId', (req, res) => liveController.getStreamDetails(req, res));
// Get signed playback URL for a stream
router.get('/:streamId/playback', (req, res) => liveController.getPlaybackUrl(req, res));
// Get chat messages for a stream
router.get('/:streamId/chat', (req, res) => liveController.getChatMessages(req, res));
// ========================
// Internal/Webhook Routes
// ========================
// Validate stream key (for RTMP ingest server)
router.post('/ingest/validate', (0, validate_js_1.validate)(live_js_1.validateStreamKeySchema), (req, res) => liveController.validateStreamKey(req, res));
// Start stream (called by transcoding engine)
router.post('/:streamId/start', (req, res) => liveController.startStream(req, res));
// End stream (can be called by transcoding engine or owner)
router.post('/:streamId/end', (req, res) => liveController.endStream(req, res));
// Link VOD recording to stream (internal)
router.post('/:streamId/link-vod', (req, res) => liveController.linkVod(req, res));
// Update viewer count (internal)
router.post('/:streamId/viewers', (req, res) => liveController.updateViewerCount(req, res));
// ========================
// Protected Routes
// ========================
// Create a new live stream
router.post('/create', auth_js_1.authenticate, rateLimiter_js_1.liveLimiter, (0, validate_js_1.validate)(live_js_1.createLiveStreamSchema), (req, res) => liveController.createStream(req, res));
// Get my streams (creator's stream history)
router.get('/my/streams', auth_js_1.authenticate, (req, res) => liveController.getMyStreams(req, res));
// Get stream key (owner only)
router.get('/:streamId/key', auth_js_1.authenticate, (req, res) => liveController.getStreamKey(req, res));
// Regenerate stream key
router.post('/:streamId/regenerate-key', auth_js_1.authenticate, (req, res) => liveController.regenerateStreamKey(req, res));
// Update stream metadata
router.patch('/:streamId', auth_js_1.authenticate, (0, validate_js_1.validate)(live_js_1.updateLiveStreamSchema), (req, res) => liveController.updateStream(req, res));
// Delete stream
router.delete('/:streamId', auth_js_1.authenticate, (req, res) => liveController.deleteStream(req, res));
// ========================
// Chat Routes (Protected)
// ========================
// Send chat message
router.post('/:streamId/chat', auth_js_1.authenticate, rateLimiter_js_1.liveChatLimiter, (0, validate_js_1.validate)(live_js_1.sendChatMessageSchema), (req, res) => liveController.sendChatMessage(req, res));
// Delete chat message
router.delete('/:streamId/chat/:messageId', auth_js_1.authenticate, (req, res) => liveController.deleteChatMessage(req, res));
// Pin chat message (stream owner only)
router.post('/:streamId/chat/:messageId/pin', auth_js_1.authenticate, (req, res) => liveController.pinChatMessage(req, res));
exports.default = router;
//# sourceMappingURL=live.routes.js.map