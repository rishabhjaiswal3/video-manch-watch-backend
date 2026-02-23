import { v4 as uuidv4 } from 'uuid';
import { Video } from '../../../shared/models/Video.js';
import { r2Service } from '../../../infra/storage/r2Service.js';
import { queueService } from '../../../infra/queue/queueService.js';
import { R2_BUCKETS } from '../../../shared/config/r2.js';

// Constants
const ALLOWED_MIME_TYPES = [
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'
];
const MAX_USER_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_CREATOR_SIZE = 30 * 1024 * 1024 * 1024; // 30GB
const MAX_UPLOAD_RETRIES = 3;
const MAX_TRANSCODING_RETRIES = 3;
const RETRYABLE_STATUSES = ['failed', 'pending'];

// Queue Stats Cache
let statsCache: { data: unknown; timestamp: number } | null = null;
const STATS_CACHE_TTL = 30000;

export class UploadService {

    /**
     * Helper: Update status with history
     */
    private setStatusWithHistory(
        video: any,
        to: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'deleted',
        reason?: string
    ) {
        const from = video.status;
        if (from === to) return;
        if (!video.statusHistory) {
            video.statusHistory = [];
        }
        video.statusHistory.push({
            from,
            to,
            at: new Date(),
            reason,
        });
        video.status = to;
    }

    /**
     * Initialize Upload
     */
    async initializeUpload(
        userId: string,
        userType: 'user' | 'creator' | 'admin',
        data: {
            filename: string;
            fileSize: number;
            mimeType: string;
            title: string;
            description?: string;
            contentType?: string;
            videoId?: string;
        }
    ) {
        const { filename, fileSize, mimeType, title, description, contentType, videoId: providedVideoId } = data;

        // Validation
        const validContentTypes = ['vod', 'reel', 'live'];
        const finalContentType = (contentType && validContentTypes.includes(contentType))
            ? (contentType as 'vod' | 'reel' | 'live')
            : 'vod';

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
        }

        const maxSize = userType === 'creator' ? MAX_CREATOR_SIZE : MAX_USER_SIZE;
        if (fileSize > maxSize) {
            throw new Error(`File size exceeds limit. Max: ${maxSize / (1024 * 1024 * 1024)}GB`);
        }

        if (title.length > 200) {
            throw new Error('Title too long. Max 200 chars.');
        }

        let video = null;
        let videoId = providedVideoId;

        if (videoId) {
            // Reuse logic
            video = await Video.findOne({ videoId });
            if (!video) throw new Error('Video not found');
            if (video.userId !== userId) throw new Error('Unauthorized');
            if (!RETRYABLE_STATUSES.includes(video.status)) {
                throw new Error(`Cannot retry video with status '${video.status}'`);
            }
            if ((video.retryCount || 0) >= MAX_UPLOAD_RETRIES) {
                throw new Error(`Max upload retries (${MAX_UPLOAD_RETRIES}) reached`);
            }
        } else {
            videoId = uuidv4();
        }

        // Generate R2 Presigned URL
        const presignedData = await r2Service.getUploadPresignedUrl(
            userId,
            videoId!,
            filename,
            mimeType,
            userType
        );

        const presignedUrlExpiresAt = new Date(Date.now() + presignedData.expiresIn * 1000);

        if (!video) {
            // Create new
            video = new Video({
                videoId,
                userId,
                userType,
                title,
                description,
                contentType: finalContentType,
                originalFile: {
                    filename,
                    size: fileSize,
                    mimeType,
                    r2Key: presignedData.key,
                },
                status: 'pending',
                presignedUrlExpiresAt,
                retryCount: 0,
                statusHistory: [{ from: 'pending', to: 'pending', at: new Date(), reason: 'upload-init' }],
            });
            await video.save();
        } else {
            // Update existing
            this.setStatusWithHistory(video, 'pending', 'upload-reinit');
            video.title = title;
            if (description) video.description = description;
            video.contentType = finalContentType;
            video.originalFile = { filename, size: fileSize, mimeType, r2Key: presignedData.key };
            video.transcoding = { progress: 0 };
            video.transcodingCompleted = false;
            video.outputs = [];
            video.masterPlaylistUrl = undefined;
            video.thumbnail = undefined;
            video.thumbnails = [];
            video.duration = undefined;
            video.originalMetadata = undefined;
            video.presignedUrlExpiresAt = presignedUrlExpiresAt;
            video.retryCount = (video.retryCount || 0) + 1;
            await video.save();
        }

        return {
            videoId,
            uploadUrl: presignedData.uploadUrl,
            r2Key: presignedData.key,
            expiresIn: presignedData.expiresIn,
        };
    }

    /**
     * Complete Upload
     */
    async completeUpload(userId: string, videoId: string) {
        const video = await Video.findOne({ videoId });
        if (!video) throw new Error('Video not found');
        if (video.userId !== userId) throw new Error('Unauthorized');

        if (video.status !== 'pending') throw new Error(`Invalid status: ${video.status}. Expected: pending`);

        if (video.presignedUrlExpiresAt && new Date() > video.presignedUrlExpiresAt) {
            throw new Error('Upload URL expired');
        }

        // Verify R2
        const fileExists = await r2Service.fileExists(R2_BUCKETS.RAW, video.originalFile.r2Key);
        if (!fileExists) throw new Error('File not found in storage');

        // Update Metadata
        const metadata = await r2Service.getFileMetadata(R2_BUCKETS.RAW, video.originalFile.r2Key);

        this.setStatusWithHistory(video, 'queued', 'upload-complete');
        if (metadata) video.originalFile.size = metadata.size;
        await video.save();

        // Add to Queue
        const qualities = video.userType === 'creator'
            ? ['1080p', '720p', '480p', '360p', '240p']
            : ['720p', '480p', '360p', '240p'];

        const jobId = await queueService.addTranscodeJob({
            videoId: video.videoId,
            userId: video.userId,
            userType: video.userType,
            r2Key: video.originalFile.r2Key,
            qualities,
        });

        video.transcoding = { jobId, progress: 0 };
        await video.save();

        return { videoId, status: video.status, jobId, message: 'Processing started' };
    }

    /**
     * Get Status
     */
    async getStatus(userId: string, videoId: string) {
        const video = await Video.findOne({ videoId });
        if (!video) return null;
        if (video.userId !== userId) throw new Error('Unauthorized');

        let jobStatus = null;
        if (video.transcoding?.jobId && video.status === 'processing') {
            try {
                jobStatus = await queueService.getJobStatus(video.videoId, video.userType);
            } catch { }
        }

        return {
            videoId: video.videoId,
            title: video.title,
            status: video.status,
            transcoding: {
                progress: video.transcoding?.progress || 0,
                startedAt: video.transcoding?.startedAt,
                completedAt: video.transcoding?.completedAt,
                error: video.transcoding?.error,
            },
            jobStatus,
            outputs: video.outputs,
            thumbnail: video.thumbnail,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
        };
    }

    /**
     * List Creator's Videos
     */
    async listCreatorVideos(userId: string, params: { page: number; limit: number; status?: string; contentType?: string }) {
        const skip = (params.page - 1) * params.limit;

        const query: any = { userId };
        query.status = params.status || { $ne: 'deleted' };

        if (params.contentType) query.contentType = params.contentType;

        const [videos, total] = await Promise.all([
            Video.find(query).sort({ createdAt: -1 }).skip(skip).limit(params.limit).lean(),
            Video.countDocuments(query),
        ]);

        return {
            videos: videos.map(v => ({
                videoId: v.videoId,
                title: v.title,
                description: v.description,
                status: v.status,
                thumbnail: v.thumbnail,
                duration: v.duration,
                outputs: v.outputs,
                masterPlaylistUrl: v.masterPlaylistUrl,
                contentType: v.contentType || 'vod',
                transcoding: { progress: v.transcoding?.progress || 0, error: v.transcoding?.error },
                createdAt: v.createdAt,
                updatedAt: v.updatedAt,
            })),
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }

    /**
     * Get Queue Stats
     */
    async getQueueStats() {
        if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
            return { data: statsCache.data, cached: true };
        }

        const [userQueue, creatorQueue] = await Promise.all([
            queueService.getQueueStats('user'),
            queueService.getQueueStats('creator'),
        ]);

        const data = { userQueue, creatorQueue };
        statsCache = { data, timestamp: Date.now() };
        return { data, cached: false };
    }

    /**
     * Retry Transcoding
     */
    async retryTranscoding(userId: string, videoId: string) {
        const video = await Video.findOne({ videoId });
        if (!video) throw new Error('Video not found');
        if (video.userId !== userId) throw new Error('Unauthorized');

        // Check retry limit
        if ((video.retryCount || 0) >= MAX_TRANSCODING_RETRIES) {
            throw new Error(`Max retries (${MAX_TRANSCODING_RETRIES}) reached`);
        }

        // Atomic update
        const updated = await Video.findOneAndUpdate(
            { videoId, userId, status: 'failed' },
            {
                $set: { status: 'queued', 'transcoding.progress': 0, 'transcoding.error': undefined },
                $push: {
                    statusHistory: { from: 'failed', to: 'queued', at: new Date(), reason: 'transcode-retry' }
                },
                $inc: { retryCount: 1 }
            },
            { new: true }
        );

        if (!updated) {
            // Check why
            if (video.status !== 'failed') throw new Error(`Cannot retry status: ${video.status}`);
            throw new Error('Retry failed (concurrency)');
        }

        // Verify R2
        const fileExists = await r2Service.fileExists(R2_BUCKETS.RAW, updated.originalFile.r2Key);
        if (!fileExists) {
            await Video.updateOne({ videoId }, { $set: { status: 'failed', 'transcoding.error': 'File missing' } });
            throw new Error('Original file missing');
        }

        // Queue
        const qualities = updated.userType === 'creator'
            ? ['1080p', '720p', '480p', '360p', '240p']
            : ['720p', '480p', '360p', '240p'];

        const jobId = await queueService.addTranscodeJob({
            videoId: updated.videoId,
            userId: updated.userId,
            userType: updated.userType,
            r2Key: updated.originalFile.r2Key,
            qualities,
        });

        await Video.updateOne({ videoId }, { $set: { 'transcoding.jobId': jobId } });

        return { videoId, status: 'queued', jobId, message: 'Transcoding restarted' };
    }

    /**
     * Get Raw URL
     */
    async getRawUrl(userId: string, videoId: string) {
        const video = await Video.findOne({ videoId });
        if (!video) throw new Error('Video not found');
        if (video.userId !== userId) throw new Error('Unauthorized');

        const rawUrl = await r2Service.getDownloadPresignedUrl(R2_BUCKETS.RAW, video.originalFile.r2Key, 3600);
        return {
            videoId,
            rawUrl,
            expiresIn: 3600,
            filename: video.originalFile.filename,
            mimeType: video.originalFile.mimeType,
        };
    }

    /**
     * Update Video
     */
    async updateVideo(userId: string, videoId: string, updates: { title?: string; description?: string }) {
        const video = await Video.findOne({ videoId });
        if (!video) throw new Error('Video not found');
        if (video.userId !== userId) throw new Error('Unauthorized');
        if (video.status === 'deleted') throw new Error('Video is deleted');

        if (updates.title) video.title = updates.title.trim();
        if (updates.description) video.description = updates.description.trim();

        await video.save();
        return {
            videoId: video.videoId,
            title: video.title,
            description: video.description,
            status: video.status,
            updatedAt: video.updatedAt,
        };
    }

    /**
     * Delete Video
     */
    async deleteVideo(userId: string, videoId: string) {
        const video = await Video.findOne({ videoId });
        if (!video) throw new Error('Video not found');
        if (video.userId !== userId) throw new Error('Unauthorized');
        if (video.status === 'deleted') throw new Error('Already deleted');
        if (video.status === 'processing') throw new Error('Cannot delete processing video');

        this.setStatusWithHistory(video, 'deleted', 'user-delete');
        await video.save();

        return { videoId, status: 'deleted', message: 'Deleted successfully' };
    }
}
