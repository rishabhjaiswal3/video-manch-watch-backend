import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import * as profileCtrl from './controller/profile.controller.js';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many upload requests. Please slow down.' },
  keyGenerator: (req) => `${req.user?.userId || req.ip}:upload`,
});

const rawImageParser = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  limit: '20mb',
});

router.get('/profile/me', authenticate, profileCtrl.getMyProfile);
router.patch('/profile', authenticate, profileCtrl.updateProfile);
router.post('/profile/me/:type/direct', authenticate, uploadLimiter, rawImageParser, profileCtrl.uploadAsset);

router.get('/profile/username/:username', profileCtrl.getProfileByUsername);
router.get('/profile/check/:username', profileCtrl.checkUsername);

router.get('/profile/:userId', profileCtrl.getProfile);
router.get('/profile/:userId/videos', profileCtrl.getCreatorVideos);

export default router;
