import { Router } from 'express';
import * as videoCtrl from './controller/video.controller.js';
import * as relatedCtrl from './controller/related.controller.js';
import * as searchCtrl from './controller/search.controller.js';
import { optionalAuthenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/search/suggestions', searchCtrl.suggestions);
router.get('/search', optionalAuthenticate, searchCtrl.search);
router.get('/videos', videoCtrl.listVideos);
router.get('/interest', videoCtrl.listVideos);
router.get('/videos/reels', videoCtrl.listReels);
router.get('/videos/:videoId/related', optionalAuthenticate, relatedCtrl.listRelatedVideos);
router.get('/videos/:videoId', videoCtrl.getVideo);

export default router;
