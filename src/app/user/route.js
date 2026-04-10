import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as profileCtrl from './controller/profile.controller.js';

const router = Router();

router.get('/profile/me', authenticate, profileCtrl.getMyProfile);
router.patch('/profile', authenticate, profileCtrl.updateProfile);

router.get('/profile/username/:username', profileCtrl.getProfileByUsername);
router.get('/profile/check/:username', profileCtrl.checkUsername);

router.get('/profile/:userId', profileCtrl.getProfile);
router.get('/profile/:userId/videos', profileCtrl.getCreatorVideos);

export default router;
