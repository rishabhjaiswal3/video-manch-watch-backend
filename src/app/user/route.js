import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import * as authCtrl from './controller/auth.controller.js';
import * as profileCtrl from './controller/profile.controller.js';

const router = Router();

router.use('/auth', authLimiter);

router.post('/auth/signup/otp', authCtrl.requestSignupOtp);
router.post('/auth/signup', authCtrl.signup);
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authCtrl.logout);




router.post('/auth/password/user/request', authCtrl.requestUserPasswordReset);
router.post('/auth/password/user/reset', authCtrl.resetUserPassword);

router.get('/profile/me', authenticate, profileCtrl.getMyProfile);
router.patch('/profile', authenticate, profileCtrl.updateProfile);

router.get('/profile/username/:username', profileCtrl.getProfileByUsername);
router.get('/profile/check/:username', profileCtrl.checkUsername);

router.get('/profile/:userId', profileCtrl.getProfile);
router.get('/profile/:userId/videos', profileCtrl.getCreatorVideos);

export default router;
