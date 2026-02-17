"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_js_1 = require("./controllers/profile.controller.js");
const validate_js_1 = require("../../middleware/validate.js");
const social_js_1 = require("../../schemas/social.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
const profileController = new profile_controller_js_1.ProfileController();
/**
 * Protected Routes (must come before dynamic :userId routes)
 */
// Get own profile
router.get('/me', auth_js_1.authenticate, (req, res) => profileController.getMyProfile(req, res));
// Create profile
router.post('/me', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.createProfileSchema), (req, res) => profileController.createProfile(req, res));
// Update profile
router.patch('/me', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.updateProfileSchema), (req, res) => profileController.updateProfile(req, res));
// Get presigned URL for avatar upload
router.post('/me/avatar', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.uploadAssetSchema), (req, res) => profileController.getAvatarUploadUrl(req, res));
// Confirm avatar upload
router.patch('/me/avatar', auth_js_1.authenticate, (req, res) => profileController.confirmAvatarUpload(req, res));
// Get presigned URL for banner upload
router.post('/me/banner', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.uploadAssetSchema), (req, res) => profileController.getBannerUploadUrl(req, res));
// Confirm banner upload
router.patch('/me/banner', auth_js_1.authenticate, (req, res) => profileController.confirmBannerUpload(req, res));
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
exports.default = router;
//# sourceMappingURL=profile.routes.js.map