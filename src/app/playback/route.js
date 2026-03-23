import { Router } from 'express';
import * as playbackCtrl from './controller/playback.controller.js';

const router = Router();

router.get('/stream/:videoId', playbackCtrl.getSignedStream);

export default router;
