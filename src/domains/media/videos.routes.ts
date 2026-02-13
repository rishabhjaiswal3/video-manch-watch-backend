import { Router } from 'express';
import { VideoController } from './controllers/video.controller.js';

const router = Router();
const videoController = new VideoController();

router.get('/', (req, res) => videoController.listVideos(req, res));
router.get('/type/reels', (req, res) => videoController.listReels(req, res));
router.get('/:videoId', (req, res) => videoController.getVideo(req, res));

export default router;
