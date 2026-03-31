import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as playbackCtrl from './controller/playback.controller.js';
import * as eventsCtrl   from './controller/events.controller.js';
import * as historyCtrl  from './controller/history.controller.js';

const router = Router();

// Signed stream URL (existing)
router.get('/stream/:videoId', playbackCtrl.getSignedStream);

// Event ingestion — auth optional, high-throughput, Redis-only
router.post('/events', authenticate, eventsCtrl.ingestEvents);

// Watch history + resume position — auth required
router.get('/history',           authenticate, historyCtrl.getHistory);
router.get('/progress/:videoId', authenticate, historyCtrl.getProgress);

export default router;
