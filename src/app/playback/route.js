import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import * as playbackCtrl   from './controller/playback.controller.js';
import * as eventsCtrl     from './controller/events.controller.js';
import * as historyCtrl    from './controller/history.controller.js';
import * as discoveryCtrl  from './controller/discovery.controller.js';

const router = Router();

// Signed stream URL
router.get('/stream/:videoId', playbackCtrl.getSignedStream);

// Event ingestion — auth required, high-throughput, Redis-only
router.post('/events', authenticate, eventsCtrl.ingestEvents);

// Discovery/recommendation events — auth optional, fire-and-forget
router.post('/discovery-events', optionalAuthenticate, discoveryCtrl.ingestDiscoveryEvents);

// Watch history + resume position — auth required
router.get('/history',           authenticate, historyCtrl.getHistory);
router.get('/progress/:videoId', authenticate, historyCtrl.getProgress);

export default router;
