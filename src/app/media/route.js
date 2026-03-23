import { Router } from 'express';
import * as videoCtrl from './controller/video.controller.js';

const router = Router();

router.get('/videos', videoCtrl.listVideos);
router.get('/interest', videoCtrl.listVideos);
router.get('/videos/reels', videoCtrl.listReels);
router.get('/videos/:videoId', videoCtrl.getVideo);

export default router;
