"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profile_service_js_1 = require("../services/profile.service.js");
const authHelpers_js_1 = require("../../../utils/authHelpers.js");
const profileService = new profile_service_js_1.ProfileService();
class ProfileController {
    /**
     * Get profile by user ID
     */
    async getProfile(req, res) {
        try {
            const { userId } = req.params;
            const profile = await profileService.getProfileByUserId(userId);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    error: 'Profile not found',
                });
            }
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Get profile error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get profile',
            });
        }
    }
    /**
     * Get own profile
     */
    async getMyProfile(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const profile = await profileService.getProfileByUserId(userId);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    error: 'Profile not found. Please create a profile.',
                });
            }
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Get my profile error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get profile',
            });
        }
    }
    /**
     * Create profile
     */
    async createProfile(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const profile = await profileService.createProfile(userId, req.body);
            return res.status(201).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Create profile error:', error);
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'Username is already taken',
                });
            }
            if (error.message.includes('already exists') || error.message.includes('already taken')) {
                return res.status(409).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to create profile',
            });
        }
    }
    /**
     * Update profile
     */
    async updateProfile(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const profile = await profileService.updateProfile(userId, req.body);
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Update profile error:', error);
            if (error.message === 'Profile not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to update profile',
            });
        }
    }
    /**
     * Get presigned URL for avatar upload
     */
    async getAvatarUploadUrl(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { filename, mimeType } = req.body;
            const result = await profileService.getAvatarUploadUrl(userId, filename, mimeType);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[PROFILE] Avatar upload URL error:', error);
            if (error.message.includes('Profile not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to generate upload URL',
            });
        }
    }
    /**
     * Get presigned URL for banner upload
     */
    async getBannerUploadUrl(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { filename, mimeType } = req.body;
            const result = await profileService.getBannerUploadUrl(userId, filename, mimeType);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[PROFILE] Banner upload URL error:', error);
            if (error.message.includes('Profile not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to generate upload URL',
            });
        }
    }
    /**
     * Confirm avatar upload (update avatar URL)
     */
    async confirmAvatarUpload(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { avatarUrl } = req.body;
            const profile = await profileService.updateAvatar(userId, avatarUrl);
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Confirm avatar error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update avatar',
            });
        }
    }
    /**
     * Confirm banner upload (update banner URL)
     */
    async confirmBannerUpload(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { bannerUrl } = req.body;
            const profile = await profileService.updateBanner(userId, bannerUrl);
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Confirm banner error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update banner',
            });
        }
    }
    /**
     * Get profile by username
     */
    async getProfileByUsername(req, res) {
        try {
            const { username } = req.params;
            const profile = await profileService.getProfileByUsername(username);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    error: 'Profile not found',
                });
            }
            return res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            console.error('[PROFILE] Get profile by username error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get profile',
            });
        }
    }
    /**
     * Get creator's public videos
     */
    async getCreatorVideos(req, res) {
        try {
            const { userId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await profileService.getCreatorVideos(userId, page, limit);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[PROFILE] Get creator videos error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get videos',
            });
        }
    }
    /**
     * Check username availability
     */
    async checkUsername(req, res) {
        try {
            const { username } = req.params;
            const available = await profileService.isUsernameAvailable(username);
            return res.status(200).json({
                success: true,
                data: { available },
            });
        }
        catch (error) {
            console.error('[PROFILE] Check username error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to check username',
            });
        }
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=profile.controller.js.map