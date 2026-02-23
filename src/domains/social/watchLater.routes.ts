import { Router } from 'express';
import { WatchLaterController } from './controllers/watchLater.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const controller = new WatchLaterController();

// All routes require auth
router.use(authenticate);

// GET  /watch-later           — get user's watch later list
router.get('/', (req, res) => controller.getList(req, res));

// POST /watch-later/:videoId  — add video to watch later
router.post('/:videoId', (req, res) => controller.add(req, res));

// DELETE /watch-later/:videoId — remove from watch later
router.delete('/:videoId', (req, res) => controller.remove(req, res));

// GET /watch-later/:videoId/status — check if saved
router.get('/:videoId/status', (req, res) => controller.getStatus(req, res));

export default router;
