import { Router } from 'express';
import * as videoCtrl from './controller/video.controller.js';
import * as relatedCtrl from './controller/related.controller.js';
import * as searchCtrl from './controller/search.controller.js';
import * as recsCtrl from './controller/recommendations.controller.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';
import * as recommendationCtrl from './controller/recommendation.controller.js';

const router = Router();

// Hybrid / explore (optional auth — Mongo scoring). Safe for anonymous clients.
router.get('/recommendations', optionalAuthenticate, recsCtrl.listRecommendations);
// Python worker artifacts + global backfill (auth required).
router.get('/recommendations/personalized', authenticate, recommendationCtrl.getRecommendations);

router.get('/search/suggestions', searchCtrl.suggestions);
router.get('/search', optionalAuthenticate, searchCtrl.search);
router.get('/videos', videoCtrl.listVideos);
router.get('/interest', videoCtrl.listVideos);
router.get('/videos/reels', videoCtrl.listReels);
router.get('/videos/:videoId/related', optionalAuthenticate, relatedCtrl.listRelatedVideos);
router.get('/videos/:videoId', videoCtrl.getVideo);

export default router;
