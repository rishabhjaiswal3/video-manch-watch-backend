import { Router } from 'express';
import userRoutes from './user/route.js';
import mediaRoutes from './media/route.js';
import socialRoutes from './social/route.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/media', mediaRoutes);
router.use('/social', socialRoutes);

export default router;
