import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as videoCtrl          from './controller/video.controller.js';
import * as recommendationCtrl from './controller/recommendation.controller.js';

const router = Router();

// ── Public video endpoints ────────────────────────────────────────────────────
router.get('/videos',        videoCtrl.listVideos);
router.get('/interest',      videoCtrl.listVideos);
router.get('/videos/reels',  videoCtrl.listReels);
router.get('/videos/:videoId', videoCtrl.getVideo);

// ── Personalized recommendations (auth required) ──────────────────────────────
// GET /media/recommendations?limit=20&contentType=vod
// Falls back to global trending for cold-start users.
router.get('/recommendations', authenticate, recommendationCtrl.getRecommendations);

export default router;
