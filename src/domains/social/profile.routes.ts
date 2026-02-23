import { Router } from 'express';
import { ProfileController } from './controllers/profile.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { createProfileSchema, updateProfileSchema, uploadAssetSchema } from '../../shared/schemas/social.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
const profileController = new ProfileController();

/**
 * Protected Routes (must come before dynamic :userId routes)
 */
// Get own profile
router.get('/me', authenticate, (req, res) => profileController.getMyProfile(req, res));

// Create profile
router.post('/me', authenticate, validate(createProfileSchema), (req, res) =>
  profileController.createProfile(req, res)
);

// Update profile
router.patch('/me', authenticate, validate(updateProfileSchema), (req, res) =>
  profileController.updateProfile(req, res)
);

// Get presigned URL for avatar upload
router.post('/me/avatar', authenticate, validate(uploadAssetSchema), (req, res) =>
  profileController.getAvatarUploadUrl(req, res)
);

// Confirm avatar upload
router.patch('/me/avatar', authenticate, (req, res) =>
  profileController.confirmAvatarUpload(req, res)
);

// Get presigned URL for banner upload
router.post('/me/banner', authenticate, validate(uploadAssetSchema), (req, res) =>
  profileController.getBannerUploadUrl(req, res)
);

// Confirm banner upload
router.patch('/me/banner', authenticate, (req, res) =>
  profileController.confirmBannerUpload(req, res)
);

/**
 * Public Routes with specific paths (before dynamic routes)
 */
// Get profile by username
router.get('/username/:username', (req, res) => profileController.getProfileByUsername(req, res));

// Check username availability
router.get('/check/:username', (req, res) => profileController.checkUsername(req, res));

/**
 * Public Routes with dynamic paths (must be last)
 */
// Get profile by user ID
router.get('/:userId', (req, res) => profileController.getProfile(req, res));

// Get creator's public videos
router.get('/:userId/videos', (req, res) => profileController.getCreatorVideos(req, res));

export default router;
