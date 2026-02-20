import { Router } from 'express';
import { LiveController } from './controllers/live.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createLiveStreamSchema,
  updateLiveStreamSchema,
  sendChatMessageSchema,
  validateStreamKeySchema,
} from '../../schemas/live.js';
import { authenticate } from '../../middleware/auth.js';
import { liveLimiter, liveChatLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
const liveController = new LiveController();

// ========================
// Public Routes
// ========================

// Get active live streams
router.get('/streams', (req, res) => liveController.getActiveStreams(req, res));

// Get stream details
router.get('/:streamId', (req, res) => liveController.getStreamDetails(req, res));

// Get chat messages for a stream
router.get('/:streamId/chat', (req, res) => liveController.getChatMessages(req, res));

// ========================
// Internal/Webhook Routes
// ========================

// Validate stream key (for RTMP ingest server)
router.post('/ingest/validate', validate(validateStreamKeySchema), (req, res) =>
  liveController.validateStreamKey(req, res)
);

// Start stream (called by transcoding engine)
router.post('/:streamId/start', (req, res) => liveController.startStream(req, res));

// End stream (can be called by transcoding engine or owner)
router.post('/:streamId/end', (req, res) => liveController.endStream(req, res));

// Update viewer count (internal)
router.post('/:streamId/viewers', (req, res) => liveController.updateViewerCount(req, res));

// ========================
// Protected Routes
// ========================

// Create a new live stream
router.post(
  '/create',
  authenticate,
  liveLimiter,
  validate(createLiveStreamSchema),
  (req, res) => liveController.createStream(req, res)
);

// Get my streams (creator's stream history)
router.get('/my/streams', authenticate, (req, res) => liveController.getMyStreams(req, res));

// Get stream key (owner only)
router.get('/:streamId/key', authenticate, (req, res) => liveController.getStreamKey(req, res));

// Regenerate stream key
router.post('/:streamId/regenerate-key', authenticate, (req, res) =>
  liveController.regenerateStreamKey(req, res)
);

// Update stream metadata
router.patch(
  '/:streamId',
  authenticate,
  validate(updateLiveStreamSchema),
  (req, res) => liveController.updateStream(req, res)
);

// Delete stream
router.delete('/:streamId', authenticate, (req, res) => liveController.deleteStream(req, res));

// ========================
// Chat Routes (Protected)
// ========================

// Send chat message
router.post(
  '/:streamId/chat',
  authenticate,
  liveChatLimiter,
  validate(sendChatMessageSchema),
  (req, res) => liveController.sendChatMessage(req, res)
);

// Delete chat message
router.delete('/:streamId/chat/:messageId', authenticate, (req, res) =>
  liveController.deleteChatMessage(req, res)
);

// Pin chat message (stream owner only)
router.post('/:streamId/chat/:messageId/pin', authenticate, (req, res) =>
  liveController.pinChatMessage(req, res)
);

export default router;
