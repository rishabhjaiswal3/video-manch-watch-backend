import type { CreateProfileInput, UpdateProfileInput } from '../../../shared/schemas/social.js';
export declare class ProfileService {
    private subscriptionService;
    private readonly userAssetsPublicBaseUrl;
    private sanitizeUsername;
    private generateUniqueUsername;
    private ensureProfileExists;
    /**
     * Get profile by user ID
     */
    getProfileByUserId(userId: string): Promise<(import("mongoose").FlattenMaps<import("../../../shared/models/Profile.js").IProfile> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    getProfileData(userId: string): Promise<Record<string, unknown> | null>;
    /**
     * Get profile by username
     */
    getProfileByUsername(username: string): Promise<(import("mongoose").FlattenMaps<import("../../../shared/models/Profile.js").IProfile> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Create a new profile
     */
    createProfile(userId: string, data: CreateProfileInput): Promise<import("../../../shared/models/Profile.js").IProfile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Update profile
     */
    updateProfile(userId: string, data: UpdateProfileInput): Promise<import("../../../shared/models/Profile.js").IProfile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Get presigned URL for avatar upload
     */
    getAvatarUploadUrl(userId: string, filename: string, mimeType: string): Promise<{
        uploadUrl: string;
        key: string;
        expiresIn: number;
    }>;
    /**
     * Get presigned URL for banner upload
     */
    getBannerUploadUrl(userId: string, filename: string, mimeType: string): Promise<{
        uploadUrl: string;
        key: string;
        expiresIn: number;
    }>;
    private toAssetUrl;
    uploadAssetDirect(userId: string, type: 'avatar' | 'banner', mimeType: string, body: Buffer): Promise<{
        key: string;
        url: string;
    }>;
    /**
     * Update avatar URL after upload
     */
    updateAvatar(userId: string, avatarUrl: string): Promise<import("../../../shared/models/Profile.js").IProfile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Update banner URL after upload
     */
    updateBanner(userId: string, bannerUrl: string): Promise<import("../../../shared/models/Profile.js").IProfile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Get creator's public videos
     */
    getCreatorVideos(userId: string, page?: number, limit?: number): Promise<{
        videos: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Increment subscriber count
     */
    incrementSubscriberCount(userId: string, amount?: number): Promise<void>;
    /**
     * Increment total likes
     */
    incrementTotalLikes(userId: string, amount?: number): Promise<void>;
    /**
     * Check if username is available
     */
    isUsernameAvailable(username: string): Promise<boolean>;
}
//# sourceMappingURL=profile.service.d.ts.map