import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';

const profileService = new ProfileService();
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export class ProfileController {
  /**
   * Get profile by user ID
   */
  async getProfile(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async getMyProfile(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const profile = await profileService.getProfileData(userId);

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
    } catch (error: any) {
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
  async createProfile(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const profile = await profileService.createProfile(userId, req.body);

      return res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
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
  async updateProfile(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const profile = await profileService.updateProfile(userId, req.body);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
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
  async getAvatarUploadUrl(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { filename, mimeType } = req.body;

      const result = await profileService.getAvatarUploadUrl(userId, filename, mimeType);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async getBannerUploadUrl(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { filename, mimeType } = req.body;

      const result = await profileService.getBannerUploadUrl(userId, filename, mimeType);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async confirmAvatarUpload(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { avatarUrl } = req.body;

      const profile = await profileService.updateAvatar(userId, avatarUrl);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
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
  async confirmBannerUpload(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { bannerUrl } = req.body;

      const profile = await profileService.updateBanner(userId, bannerUrl);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('[PROFILE] Confirm banner error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update banner',
      });
    }
  }

  async uploadAvatarDirect(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim();
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({ success: false, error: 'Unsupported image type' });
      }
      const fileBuffer = req.body as Buffer;
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'File is required' });
      }
      const result = await profileService.uploadAssetDirect(
        userId,
        'avatar',
        mimeType,
        fileBuffer
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[PROFILE] Direct avatar upload error:', error);
      return res.status(400).json({
        success: false,
        error: error?.message || 'Failed to upload avatar',
      });
    }
  }

  async uploadBannerDirect(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim();
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({ success: false, error: 'Unsupported image type' });
      }
      const fileBuffer = req.body as Buffer;
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'File is required' });
      }
      const result = await profileService.uploadAssetDirect(
        userId,
        'banner',
        mimeType,
        fileBuffer
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[PROFILE] Direct banner upload error:', error);
      return res.status(400).json({
        success: false,
        error: error?.message || 'Failed to upload banner',
      });
    }
  }

  /**
   * Get profile by username
   */
  async getProfileByUsername(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async getCreatorVideos(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await profileService.getCreatorVideos(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const available = await profileService.isUsernameAvailable(username);

      return res.status(200).json({
        success: true,
        data: { available },
      });
    } catch (error: any) {
      console.error('[PROFILE] Check username error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check username',
      });
    }
  }
}
