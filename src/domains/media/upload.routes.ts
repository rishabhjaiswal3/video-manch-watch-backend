import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import { uploadBatchLimiter, uploadLimiter } from '../../shared/middleware/rateLimiter.js';
import { UploadController } from './controllers/upload.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { completeUploadSchema, initUploadBatchSchema, initUploadSchema, thumbnailUrlSchema, updateVideoSchema } from '../../shared/schemas/upload.js';

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
router.post('/init/batch', uploadBatchLimiter as any, validate(initUploadBatchSchema), (req, res) => uploadController.initBatch(req, res));
router.post('/init', uploadLimiter as any, validate(initUploadSchema), (req, res) => uploadController.init(req, res));
router.post('/complete', validate(completeUploadSchema), (req, res) => uploadController.complete(req, res));
router.post('/retry/:videoId', (req, res) => uploadController.retry(req, res));
router.post('/thumbnail-url/:videoId', validate(thumbnailUrlSchema), (req, res) => uploadController.getThumbnailUploadUrl(req, res));
router.patch('/video/:videoId', validate(updateVideoSchema), (req, res) => uploadController.update(req, res));
router.delete('/video/:videoId', (req, res) => uploadController.delete(req, res));

export default router;
