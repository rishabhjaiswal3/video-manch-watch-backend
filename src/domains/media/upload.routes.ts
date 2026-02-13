import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { UploadController } from './controllers/upload.controller.js';

const router = Router();
const uploadController = new UploadController();

// Shared middleware
router.use(authenticate);

// List/Stats (Public-ish but authenticated)
router.get('/videos', (req, res) => uploadController.listVideos(req, res));
router.get('/queue-stats', (req, res) => uploadController.getQueueStats(req, res));
router.get('/status/:videoId', (req, res) => uploadController.getStatus(req, res));
router.get('/raw-url/:videoId', (req, res) => uploadController.getRawUrl(req, res));

// Actions (Protected/Mutative)
router.post('/init', uploadLimiter as any, (req, res) => uploadController.init(req, res));
router.post('/complete', (req, res) => uploadController.complete(req, res));
router.post('/retry/:videoId', (req, res) => uploadController.retry(req, res));
router.patch('/video/:videoId', (req, res) => uploadController.update(req, res));
router.delete('/video/:videoId', (req, res) => uploadController.delete(req, res));

export default router;
