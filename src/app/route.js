import { Router } from 'express';
import configRoutes from './config/route.js';
import playbackRoutes from './playback/route.js';
import userRoutes from './user/route.js';
import mediaRoutes from './media/route.js';
import socialRoutes from './social/route.js';

const router = Router();

router.use('/config', configRoutes);
router.use('/playback', playbackRoutes);
router.use('/user', userRoutes);
router.use('/media', mediaRoutes);
router.use('/social', socialRoutes);

export default router;
