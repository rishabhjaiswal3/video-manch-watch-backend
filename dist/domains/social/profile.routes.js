"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const profile_controller_js_1 = require("./controllers/profile.controller.js");
const validate_js_1 = require("../../shared/middleware/validate.js");
const social_js_1 = require("../../shared/schemas/social.js");
const auth_js_1 = require("../../shared/middleware/auth.js");
const rateLimiter_js_1 = require("../../shared/middleware/rateLimiter.js");
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
router.post('/me/avatar/direct', auth_js_1.authenticate, rateLimiter_js_1.uploadLimiter, express_1.default.raw({
    type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    limit: '20mb',
}), (req, res) => profileController.uploadAvatarDirect(req, res));
// Confirm avatar upload
router.patch('/me/avatar', auth_js_1.authenticate, (req, res) => profileController.confirmAvatarUpload(req, res));
// Get presigned URL for banner upload
router.post('/me/banner', auth_js_1.authenticate, (0, validate_js_1.validate)(social_js_1.uploadAssetSchema), (req, res) => profileController.getBannerUploadUrl(req, res));
router.post('/me/banner/direct', auth_js_1.authenticate, rateLimiter_js_1.uploadLimiter, express_1.default.raw({
    type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    limit: '20mb',
}), (req, res) => profileController.uploadBannerDirect(req, res));
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