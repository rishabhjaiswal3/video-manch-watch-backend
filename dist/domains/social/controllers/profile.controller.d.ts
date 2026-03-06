import { Request, Response } from 'express';
export declare class ProfileController {
    /**
     * Get profile by user ID
     */
    getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get own profile
     */
    getMyProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Create profile
     */
    createProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update profile
     */
    updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get presigned URL for avatar upload
     */
    getAvatarUploadUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get presigned URL for banner upload
     */
    getBannerUploadUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Confirm avatar upload (update avatar URL)
     */
    confirmAvatarUpload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Confirm banner upload (update banner URL)
     */
    confirmBannerUpload(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    uploadAvatarDirect(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    uploadBannerDirect(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get profile by username
     */
    getProfileByUsername(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get creator's public videos
     */
    getCreatorVideos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Check username availability
     */
    checkUsername(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=profile.controller.d.ts.map