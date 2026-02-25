import { Profile } from '../../../shared/models/Profile.js';
import { Video } from '../../../shared/models/Video.js';
import { r2Service } from '../../../infra/storage/r2Service.js';
import { R2_BUCKETS } from '../../../shared/config/r2.js';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../../shared/models/User.js';
import { SubscriptionService } from './subscription.service.js';
import type { CreateProfileInput, UpdateProfileInput } from '../../../shared/schemas/social.js';
import type { Document } from 'mongoose';

const DEFAULT_AVATAR_URL = process.env.DEFAULT_PROFILE_AVATAR_URL || '/placeholder.svg';
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const hasExpectedImageSignature = (mimeType: string, body: Buffer): boolean => {
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

function normalizePublicBaseUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  // S3 API endpoint is not a public CDN endpoint for browser GET.
  if (url.includes('.r2.cloudflarestorage.com')) return null;
  return url.replace(/\/+$/, '');
}

export class ProfileService {
  private subscriptionService = new SubscriptionService();
  private readonly userAssetsPublicBaseUrl =
    normalizePublicBaseUrl(process.env.R2_USER_ASSETS_PUBLIC_URL) ||
    normalizePublicBaseUrl(process.env.R2_PUBLIC_URL) ||
    'https://videomanch.com';

  private sanitizeUsername(input?: string): string {
    const raw = (input || 'user').split('@')[0] || 'user';
    const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    return cleaned || 'user';
  }

  private async generateUniqueUsername(baseInput?: string): Promise<string> {
    const base = this.sanitizeUsername(baseInput);
    let username = base;
    let suffix = 0;
    // Avoid collisions
    while (await Profile.exists({ username })) {
      suffix += 1;
      username = `${base}${suffix}`;
    }
    return username;
  }

  private async ensureProfileExists(userId: string, email?: string): Promise<Document | null> {
    let profile = await Profile.findOne({ userId });
    if (profile) return profile;

    const userEmail = email || (await User.findById(userId).select('email').lean())?.email;
    const username = await this.generateUniqueUsername(userEmail);
    profile = new Profile({
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
  async getProfileByUserId(userId: string) {
    return Profile.findOne({ userId }).lean();
  }

  async getProfileData(userId: string) {
    const profileDoc = await Profile.findOne({ userId }).lean();
    const user = await User.findById(userId).lean();

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
  async getProfileByUsername(username: string) {
    return Profile.findOne({ username: username.toLowerCase() }).lean();
  }

  /**
   * Create a new profile
   */
  async createProfile(userId: string, data: CreateProfileInput) {
    // Check if profile already exists
    const existingProfile = await Profile.findOne({ userId });
    if (existingProfile) {
      throw new Error('Profile already exists for this user');
    }

    // Check if username is taken
    const usernameTaken = await Profile.findOne({ username: data.username });
    if (usernameTaken) {
      throw new Error('Username is already taken');
    }

    const profile = new Profile({
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
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (data.displayName !== undefined) profile.displayName = data.displayName;
    if (data.bio !== undefined) profile.bio = data.bio;
    if (data.location !== undefined) profile.location = data.location;
    if (data.links !== undefined) profile.links = data.links;

    await profile.save();
    return profile.toObject();
  }

  /**
   * Get presigned URL for avatar upload
   */
  async getAvatarUploadUrl(
    userId: string,
    filename: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    await this.ensureProfileExists(userId);

    const fileId = uuidv4();
    const extension = filename.split('.').pop() || 'jpg';
    const key = `avatars/${userId}/${fileId}.${extension}`;

    const uploadUrl = await r2Service.getUploadPresignedUrl(
      userId,
      fileId,
      `${fileId}.${extension}`,
      mimeType,
      'user',
      R2_BUCKETS.USER_ASSETS
    );

    console.log(`[Profile] Avatar presigned URL generated`);
    console.log(`[Profile] Bucket: ${R2_BUCKETS.USER_ASSETS}`);
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
  async getBannerUploadUrl(
    userId: string,
    filename: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    await this.ensureProfileExists(userId);

    const fileId = uuidv4();
    const extension = filename.split('.').pop() || 'jpg';

    const uploadUrl = await r2Service.getUploadPresignedUrl(
      userId,
      fileId,
      `${fileId}.${extension}`,
      mimeType,
      'user',
      R2_BUCKETS.USER_ASSETS
    );

    console.log(`[Profile] Banner presigned URL generated`);
    console.log(`[Profile] R2 key (storage path): ${uploadUrl.key}`);
    console.log(`[Profile] Upload URL: ${uploadUrl.uploadUrl.split('?')[0]}`);

    return {
      uploadUrl: uploadUrl.uploadUrl,
      key: uploadUrl.key,
      expiresIn: uploadUrl.expiresIn,
    };
  }

  private toAssetUrl(key: string): string {
    const base = this.userAssetsPublicBaseUrl.replace(/\/+$/, '');
    return `${base}/${key}`;
  }

  async uploadAssetDirect(
    userId: string,
    type: 'avatar' | 'banner',
    mimeType: string,
    body: Buffer
  ): Promise<{ key: string; url: string }> {
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

    const fileId = uuidv4();
    const extension = mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/gif'
          ? 'gif'
          : 'jpg';
    const key = `user/${userId}/${fileId}/original/${fileId}.${extension}`;

    try {
      await r2Service.uploadBuffer(R2_BUCKETS.USER_ASSETS, key, body, mimeType);
    } catch (error: any) {
      console.error('[PROFILE] R2 direct upload failed', {
        bucket: R2_BUCKETS.USER_ASSETS,
        key,
        mimeType,
        fileSize: body.length,
        code: error?.Code || error?.code,
        statusCode: error?.$metadata?.httpStatusCode,
        message: error?.message,
      });
      throw new Error(
        'R2 upload denied. Check R2 bucket name and API token permissions for Object Write on user-assets.'
      );
    }

    const url = this.toAssetUrl(key);
    if (type === 'avatar') {
      await this.updateAvatar(userId, url);
    } else {
      await this.updateBanner(userId, url);
    }

    return { key, url };
  }

  /**
   * Update avatar URL after upload
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { avatar: avatarUrl },
      { new: true }
    );

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile.toObject();
  }

  /**
   * Update banner URL after upload
   */
  async updateBanner(userId: string, bannerUrl: string) {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { banner: bannerUrl },
      { new: true }
    );

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile.toObject();
  }

  /**
   * Get creator's public videos
   */
  async getCreatorVideos(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    videos: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const query = {
      userId,
      status: 'completed',
    };

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('videoId title thumbnail duration views createdAt contentType')
        .lean(),
      Video.countDocuments(query),
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
  async incrementSubscriberCount(userId: string, amount: number = 1): Promise<void> {
    await Profile.updateOne(
      { userId },
      { $inc: { subscriberCount: amount } }
    );
  }

  /**
   * Increment total likes
   */
  async incrementTotalLikes(userId: string, amount: number = 1): Promise<void> {
    await Profile.updateOne(
      { userId },
      { $inc: { totalLikes: amount } }
    );
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await Profile.findOne({ username: username.toLowerCase() });
    return !existing;
  }
}
