import { Request, Response } from 'express';
import { UploadService } from '../services/upload.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';
import { getRedisConnection } from '../../../shared/config/redis.js';

const uploadService = new UploadService();

export class UploadController {
    /**
     * Initialize upload in batch
     */
    async initBatch(req: Request, res: Response) {
        try {
            const { items, idempotencyKey } = req.body;
            const { userId, userType } = ensureAuthenticatedUser(req);
            const requestIdempotencyKey = String(idempotencyKey || req.headers['x-idempotency-key'] || '').trim();
            const cacheKey = requestIdempotencyKey
                ? `upload_init_batch:${userId}:${requestIdempotencyKey}`
                : null;

            if (cacheKey) {
                try {
                    const redis = getRedisConnection();
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        return res.status(200).json({ success: true, data: JSON.parse(cached), idempotentReplay: true });
                    }
                } catch (cacheReadError) {
                    console.warn('[UPLOAD-INIT-BATCH] Idempotency cache read failed:', cacheReadError);
                }
            }

            const result = await uploadService.initializeUploadBatch(userId, userType, items || []);

            if (cacheKey) {
                try {
                    const redis = getRedisConnection();
                    await redis.set(cacheKey, JSON.stringify(result), 'EX', 10 * 60);
                } catch (cacheWriteError) {
                    console.warn('[UPLOAD-INIT-BATCH] Idempotency cache write failed:', cacheWriteError);
                }
            }
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-INIT-BATCH] Error:', error);
            const status = error.message.includes('Maximum') || error.message.includes('required') ? 400 : 500;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * Initialize upload
     */
    async init(req: Request, res: Response) {
        try {
            const { videoId, filename, fileSize, mimeType, title, description, contentType, tags } = req.body;
            const { userId, userType } = ensureAuthenticatedUser(req);

            const result = await uploadService.initializeUpload(userId, userType, {
                filename,
                fileSize,
                mimeType,
                title,
                description,
                contentType,
                videoId,
                tags,
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-INIT] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * Complete upload
     */
    async complete(req: Request, res: Response) {
        try {
            const { videoId } = req.body;
            const { userId } = ensureAuthenticatedUser(req);

            const result = await uploadService.completeUpload(userId, videoId);

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-COMPLETE] Error:', error);
            const status = error.message.includes('Unauthorized') ? 403 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * Get status
     */
    async getStatus(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);

            const result = await uploadService.getStatus(userId, videoId);

            if (!result) return res.status(404).json({ success: false, error: 'Video not found' });

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-STATUS] Error:', error);
            const status = error.message.includes('Unauthorized') ? 403 : 500;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * List videos
     */
    async listVideos(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const status = req.query.status as string;
            const contentType = req.query.contentType as string;

            const result = await uploadService.listCreatorVideos(userId, { page, limit, status, contentType });

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-LIST] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Queue stats
     */
    async getQueueStats(_req: Request, res: Response) {
        try {
            const result = await uploadService.getQueueStats();
            return res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            console.error('[QUEUE-STATS] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Retry upload
     */
    async retry(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);

            const result = await uploadService.retryTranscoding(userId, videoId);

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[UPLOAD-RETRY] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Get Raw URL
     */
    async getRawUrl(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);

            const result = await uploadService.getRawUrl(userId, videoId);

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[RAW-URL] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Get thumbnail upload presigned URL
     */
    async getThumbnailUploadUrl(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);
            const { mimeType } = req.body;

            if (!mimeType) {
                return res.status(400).json({ success: false, error: 'mimeType is required' });
            }

            const result = await uploadService.getThumbnailUploadUrl(userId, videoId, mimeType);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[THUMBNAIL-URL] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Update video
     */
    async update(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);
            const {
                title, description, tags, contentType, thumbnail,
                isDownloadable, isAdultContent, allowLikes, allowDislikes, allowComments, visibility,
            } = req.body;

            const result = await uploadService.updateVideo(userId, videoId, {
                title, description, tags, contentType, thumbnail,
                isDownloadable, isAdultContent, allowLikes, allowDislikes, allowComments, visibility,
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[VIDEO-UPDATE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Delete video
     */
    async delete(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = ensureAuthenticatedUser(req);

            const result = await uploadService.deleteVideo(userId, videoId);

            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[VIDEO-DELETE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
}
