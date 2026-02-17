"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const Profile_js_1 = require("../../../models/Profile.js");
const Video_js_1 = require("../../../models/Video.js");
const r2Service_js_1 = require("../../../services/r2Service.js");
const uuid_1 = require("uuid");
class ProfileService {
    /**
     * Get profile by user ID
     */
    async getProfileByUserId(userId) {
        return Profile_js_1.Profile.findOne({ userId }).lean();
    }
    /**
     * Get profile by username
     */
    async getProfileByUsername(username) {
        return Profile_js_1.Profile.findOne({ username: username.toLowerCase() }).lean();
    }
    /**
     * Create a new profile
     */
    async createProfile(userId, data) {
        // Check if profile already exists
        const existingProfile = await Profile_js_1.Profile.findOne({ userId });
        if (existingProfile) {
            throw new Error('Profile already exists for this user');
        }
        // Check if username is taken
        const usernameTaken = await Profile_js_1.Profile.findOne({ username: data.username });
        if (usernameTaken) {
            throw new Error('Username is already taken');
        }
        const profile = new Profile_js_1.Profile({
            userId,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio,
            location: data.location,
            links: data.links || [],
        });
        await profile.save();
        return profile.toObject();
    }
    /**
     * Update profile
     */
    async updateProfile(userId, data) {
        const profile = await Profile_js_1.Profile.findOne({ userId });
        if (!profile) {
            throw new Error('Profile not found');
        }
        if (data.displayName !== undefined)
            profile.displayName = data.displayName;
        if (data.bio !== undefined)
            profile.bio = data.bio;
        if (data.location !== undefined)
            profile.location = data.location;
        if (data.links !== undefined)
            profile.links = data.links;
        await profile.save();
        return profile.toObject();
    }
    /**
     * Get presigned URL for avatar upload
     */
    async getAvatarUploadUrl(userId, filename, mimeType) {
        const profile = await Profile_js_1.Profile.findOne({ userId });
        if (!profile) {
            throw new Error('Profile not found. Create a profile first.');
        }
        const fileId = (0, uuid_1.v4)();
        const extension = filename.split('.').pop() || 'jpg';
        const key = `avatars/${userId}/${fileId}.${extension}`;
        const uploadUrl = await r2Service_js_1.r2Service.getUploadPresignedUrl(userId, fileId, `${fileId}.${extension}`, mimeType, 'user');
        // Store the key for later update
        return {
            uploadUrl: uploadUrl.uploadUrl,
            key: `avatars/${userId}/${fileId}.${extension}`,
            expiresIn: uploadUrl.expiresIn,
        };
    }
    /**
     * Get presigned URL for banner upload
     */
    async getBannerUploadUrl(userId, filename, mimeType) {
        const profile = await Profile_js_1.Profile.findOne({ userId });
        if (!profile) {
            throw new Error('Profile not found. Create a profile first.');
        }
        const fileId = (0, uuid_1.v4)();
        const extension = filename.split('.').pop() || 'jpg';
        const key = `banners/${userId}/${fileId}.${extension}`;
        const uploadUrl = await r2Service_js_1.r2Service.getUploadPresignedUrl(userId, fileId, `${fileId}.${extension}`, mimeType, 'user');
        return {
            uploadUrl: uploadUrl.uploadUrl,
            key: `banners/${userId}/${fileId}.${extension}`,
            expiresIn: uploadUrl.expiresIn,
        };
    }
    /**
     * Update avatar URL after upload
     */
    async updateAvatar(userId, avatarUrl) {
        const profile = await Profile_js_1.Profile.findOneAndUpdate({ userId }, { avatar: avatarUrl }, { new: true });
        if (!profile) {
            throw new Error('Profile not found');
        }
        return profile.toObject();
    }
    /**
     * Update banner URL after upload
     */
    async updateBanner(userId, bannerUrl) {
        const profile = await Profile_js_1.Profile.findOneAndUpdate({ userId }, { banner: bannerUrl }, { new: true });
        if (!profile) {
            throw new Error('Profile not found');
        }
        return profile.toObject();
    }
    /**
     * Get creator's public videos
     */
    async getCreatorVideos(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const query = {
            userId,
            status: 'completed',
        };
        const [videos, total] = await Promise.all([
            Video_js_1.Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('videoId title thumbnail duration views createdAt contentType')
                .lean(),
            Video_js_1.Video.countDocuments(query),
        ]);
        return {
            videos,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Increment subscriber count
     */
    async incrementSubscriberCount(userId, amount = 1) {
        await Profile_js_1.Profile.updateOne({ userId }, { $inc: { subscriberCount: amount } });
    }
    /**
     * Increment total likes
     */
    async incrementTotalLikes(userId, amount = 1) {
        await Profile_js_1.Profile.updateOne({ userId }, { $inc: { totalLikes: amount } });
    }
    /**
     * Check if username is available
     */
    async isUsernameAvailable(username) {
        const existing = await Profile_js_1.Profile.findOne({ username: username.toLowerCase() });
        return !existing;
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=profile.service.js.map