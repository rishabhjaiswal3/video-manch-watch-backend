import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as playbackCtrl   from './controller/playback.controller.js';
import * as eventsCtrl     from './controller/events.controller.js';
import * as historyCtrl    from './controller/history.controller.js';
import * as discoveryCtrl  from './controller/discovery.controller.js';

const router = Router();

// Signed stream URL
router.get('/stream/:videoId', playbackCtrl.getSignedStream);

// Player event ingestion — auth optional, high-throughput, Redis-only
// Now accepts source, recModelVersion, recPosition, deviceType fields
router.post('/events', authenticate, eventsCtrl.ingestEvents);

// Discovery events — impressions, clicks, scroll-past (auth optional, Mongo-direct)
// POST body: { events: [{ eventType, videoId, sessionId, position, page, section, recModelVersion }] }
router.post('/discovery-events', authenticate, discoveryCtrl.ingestDiscoveryEvents);

// Watch history + resume position — auth required
router.get('/history',           authenticate, historyCtrl.getHistory);
router.get('/progress/:videoId', authenticate, historyCtrl.getProgress);

export default router;
