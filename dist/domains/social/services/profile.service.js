"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const Profile_js_1 = require("../../../shared/models/Profile.js");
const Video_js_1 = require("../../../shared/models/Video.js");
const r2Service_js_1 = require("../../../infra/storage/r2Service.js");
const r2_js_1 = require("../../../shared/config/r2.js");
const uuid_1 = require("uuid");
const User_js_1 = require("../../../shared/models/User.js");
const subscription_service_js_1 = require("./subscription.service.js");
const DEFAULT_AVATAR_URL = process.env.DEFAULT_PROFILE_AVATAR_URL || '/placeholder.svg';
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const hasExpectedImageSignature = (mimeType, body) => {
    if (mimeType === 'image/png') {
        return body.length >= 8 &&
            body[0] === 0x89 &&
            body[1] === 0x50 &&
            body[2] === 0x4e &&
            body[3] === 0x47 &&
            body[4] === 0x0d &&
            body[5] === 0x0a &&
            body[6] === 0x1a &&
            body[7] === 0x0a;
    }
    if (mimeType === 'image/jpeg') {
        return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    }
    if (mimeType === 'image/gif') {
        return body.length >= 6 &&
            body[0] === 0x47 &&
            body[1] === 0x49 &&
            body[2] === 0x46 &&
            body[3] === 0x38 &&
            (body[4] === 0x37 || body[4] === 0x39) &&
            body[5] === 0x61;
    }
    if (mimeType === 'image/webp') {
        return body.length >= 12 &&
            body.toString('ascii', 0, 4) === 'RIFF' &&
            body.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
};
function normalizePublicBaseUrl(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    // S3 API endpoint is not a public CDN endpoint for browser GET.
    if (url.includes('.r2.cloudflarestorage.com'))
        return null;
    return url.replace(/\/+$/, '');
}
class ProfileService {
    subscriptionService = new subscription_service_js_1.SubscriptionService();
    userAssetsPublicBaseUrl = normalizePublicBaseUrl(process.env.R2_USER_ASSETS_PUBLIC_URL) ||
        normalizePublicBaseUrl(process.env.R2_PUBLIC_URL) ||
        'https://videomanch.com';
    sanitizeUsername(input) {
        const raw = (input || 'user').split('@')[0] || 'user';
        const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        return cleaned || 'user';
    }
    async generateUniqueUsername(baseInput) {
        const base = this.sanitizeUsername(baseInput);
        let username = base;
        let suffix = 0;
        // Avoid collisions
        while (await Profile_js_1.Profile.exists({ username })) {
            suffix += 1;
            username = `${base}${suffix}`;
        }
        return username;
    }
    async ensureProfileExists(userId, email) {
        let profile = await Profile_js_1.Profile.findOne({ userId });
        if (profile)
            return profile;
        const userEmail = email || (await User_js_1.User.findById(userId).select('email').lean())?.email;
        const username = await this.generateUniqueUsername(userEmail);
        profile = new Profile_js_1.Profile({
            userId,
            username,
            displayName: username,
            avatar: DEFAULT_AVATAR_URL,
        });
        await profile.save();
        return profile;
    }
    /**
     * Get profile by user ID
     */
    async getProfileByUserId(userId) {
        return Profile_js_1.Profile.findOne({ userId }).lean();
    }
    async getProfileData(userId) {
        const profileDoc = await Profile_js_1.Profile.findOne({ userId }).lean();
        const user = await User_js_1.User.findById(userId).lean();
        if (!profileDoc && !user) {
            return null;
        }
        let profile = profileDoc;
        if (!profile) {
            const ensured = await this.ensureProfileExists(userId, user?.email);
            profile = ensured ? ensured.toObject() : null;
        }
        if (!profile) {
            return null;
        }
        const [subscribersResult, followingResult] = await Promise.all([
            this.subscriptionService.getSubscribers(userId, 1, 5),
            this.subscriptionService.getFollowing(userId, 1, 5),
        ]);
        return {
            ...profile,
            email: user?.email,
            avatar: profile.avatar || DEFAULT_AVATAR_URL,
            bio: profile.bio || '',
            links: profile.links || [],
            subscribers: subscribersResult.subscribers,
            subscribersCount: subscribersResult.pagination.total,
            following: followingResult.channels,
            followingCount: followingResult.pagination.total,
        };
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
            gender: data.gender || 'prefer_not_to_reveal',
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
        if (data.gender !== undefined)
            profile.gender = data.gender;
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
        await this.ensureProfileExists(userId);
        const fileId = (0, uuid_1.v4)();
        const extension = filename.split('.').pop() || 'jpg';
        const key = `avatars/${userId}/${fileId}.${extension}`;
        const uploadUrl = await r2Service_js_1.r2Service.getUploadPresignedUrl(userId, fileId, `${fileId}.${extension}`, mimeType, 'user', r2_js_1.R2_BUCKETS.USER_ASSETS);
        console.log(`[Profile] Avatar presigned URL generated`);
        console.log(`[Profile] Bucket: ${r2_js_1.R2_BUCKETS.USER_ASSETS}`);
        console.log(`[Profile] R2 key (storage path): ${uploadUrl.key}`);
        console.log(`[Profile] full URL: ${uploadUrl.uploadUrl}`);
        console.log(`[Profile] expiresIn: ${uploadUrl.expiresIn}s`);
        console.log(`[Profile] Upload URL (no query): ${uploadUrl.uploadUrl.split('?')[0]}`);
        return {
            uploadUrl: uploadUrl.uploadUrl,
            key: uploadUrl.key,
            expiresIn: uploadUrl.expiresIn,
        };
    }
    /**
     * Get presigned URL for banner upload
     */
    async getBannerUploadUrl(userId, filename, mimeType) {
        await this.ensureProfileExists(userId);
        const fileId = (0, uuid_1.v4)();
        const extension = filename.split('.').pop() || 'jpg';
        const uploadUrl = await r2Service_js_1.r2Service.getUploadPresignedUrl(userId, fileId, `${fileId}.${extension}`, mimeType, 'user', r2_js_1.R2_BUCKETS.USER_ASSETS);
        console.log(`[Profile] Banner presigned URL generated`);
        console.log(`[Profile] R2 key (storage path): ${uploadUrl.key}`);
        console.log(`[Profile] Upload URL: ${uploadUrl.uploadUrl.split('?')[0]}`);
        return {
            uploadUrl: uploadUrl.uploadUrl,
            key: uploadUrl.key,
            expiresIn: uploadUrl.expiresIn,
        };
    }
    toAssetUrl(key) {
        const base = this.userAssetsPublicBaseUrl.replace(/\/+$/, '');
        return `${base}/${key}`;
    }
    async uploadAssetDirect(userId, type, mimeType, body) {
        await this.ensureProfileExists(userId);
        if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
            throw new Error('Unsupported image type');
        }
        if (!body.length) {
            throw new Error('Invalid image payload');
        }
        if (body.length > 20 * 1024 * 1024) {
            throw new Error('File too large');
        }
        if (!hasExpectedImageSignature(mimeType, body)) {
            throw new Error('Image signature does not match declared MIME type');
        }
        const fileId = (0, uuid_1.v4)();
        const extension = mimeType === 'image/png'
            ? 'png'
            : mimeType === 'image/webp'
                ? 'webp'
                : mimeType === 'image/gif'
                    ? 'gif'
                    : 'jpg';
        const key = `user/${userId}/${fileId}/original/${fileId}.${extension}`;
        try {
            await r2Service_js_1.r2Service.uploadBuffer(r2_js_1.R2_BUCKETS.USER_ASSETS, key, body, mimeType);
        }
        catch (error) {
            console.error('[PROFILE] R2 direct upload failed', {
                bucket: r2_js_1.R2_BUCKETS.USER_ASSETS,
                key,
                mimeType,
                fileSize: body.length,
                code: error?.Code || error?.code,
                statusCode: error?.$metadata?.httpStatusCode,
                message: error?.message,
            });
            throw new Error('R2 upload denied. Check R2 bucket name and API token permissions for Object Write on user-assets.');
        }
        const url = this.toAssetUrl(key);
        if (type === 'avatar') {
            await this.updateAvatar(userId, url);
        }
        else {
            await this.updateBanner(userId, url);
        }
        return { key, url };
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