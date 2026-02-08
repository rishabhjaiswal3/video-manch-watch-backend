import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Video } from '../models/Video.js';
import { r2Service } from '../services/r2Service.js';
import { queueService } from '../services/queueService.js';
import { R2_BUCKETS } from '../config/r2.js';
import { authenticate } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { ensureAuthenticatedUser } from '../utils/authHelpers.js';

const router = Router();

// Allowed video mime types
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
];

// Max file sizes
const MAX_USER_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_CREATOR_SIZE = 30 * 1024 * 1024 * 1024; // 30GB

/**
 * POST /api/upload/init
 * Initialize a video upload and get presigned URL for direct R2 upload
 */
router.post('/init', authenticate, uploadLimiter as any, async (req: Request, res: Response) => {
  try {
    const { filename, fileSize, mimeType, title, description } = req.body;
    const { userId, userType } = ensureAuthenticatedUser(req);

    console.log(`[UPLOAD-INIT] 🎬 New upload request from user: ${userId} (${userType})`);
    console.log(`[UPLOAD-INIT] 📄 File: ${filename}, Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB, Type: ${mimeType}`);
    console.log(`[UPLOAD-INIT] 📝 Title: ${title}`);

    // Validate required fields
    if (!filename || !fileSize || !mimeType || !title) {
      // console.warn(`[UPLOAD-INIT] ⚠️ Missing required fields`);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: filename, fileSize, mimeType, title',
      });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      // console.warn(`[UPLOAD-INIT] ⚠️ Invalid mime type: ${mimeType}`);
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    // Validate file size
    const maxSize = userType === 'creator' ? MAX_CREATOR_SIZE : MAX_USER_SIZE;
    if (fileSize > maxSize) {
      // console.warn(`[UPLOAD-INIT] ⚠️ File size ${fileSize} exceeds limit ${maxSize}`);
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit. Max size: ${maxSize / (1024 * 1024 * 1024)}GB`,
      });
    }

    // Generate unique video ID
    const videoId = uuidv4();
    console.log(`[UPLOAD-INIT] 🆔 Generated video ID: ${videoId}`);

    // Get presigned URL for direct upload to R2
    console.log(`[UPLOAD-INIT] 🔑 Generating presigned URL for R2...`);
    const presignedData = await r2Service.getUploadPresignedUrl(
      userId,
      videoId,
      filename,
      mimeType,
      userType
    );
    console.log(`[UPLOAD-INIT] ✅ Presigned URL generated, key: ${presignedData.key}`);

    // Create video document in MongoDB with pending status
    console.log(`[UPLOAD-INIT] 💾 Creating video document in MongoDB...`);
    const video = new Video({
      videoId,
      userId,
      userType,
      title,
      description,
      originalFile: {
        filename,
        size: fileSize,
        mimeType,
        r2Key: presignedData.key,
      },
      status: 'pending',
    });

    await video.save();
    console.log(`[UPLOAD-INIT] ✅ Video document created with status: pending`);
    console.log(`[UPLOAD-INIT] 🎉 Upload initialization complete for video: ${videoId}`);

    return res.status(200).json({
      success: true,
      data: {
        videoId,
        uploadUrl: presignedData.uploadUrl,
        r2Key: presignedData.key,
        expiresIn: presignedData.expiresIn,
      },
    });
  } catch (error) {
    console.error('[UPLOAD-INIT] ❌ Error initializing upload:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize upload',
    });
  }
});

/**
 * POST /api/upload/complete
 * Called after client finishes uploading to R2 - verifies and queues for processing
 */
router.post('/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.body;
    const { userId: currentUserId } = ensureAuthenticatedUser(req);

    console.log(`[UPLOAD-COMPLETE] 🏁 Complete upload request for video: ${videoId}`);

    if (!videoId) {
      // console.warn(`[UPLOAD-COMPLETE] ⚠️ Missing videoId`);
      return res.status(400).json({
        success: false,
        error: 'Missing videoId',
      });
    }

    // Find the video document
    console.log(`[UPLOAD-COMPLETE] 🔍 Looking up video in database...`);
    const video = await Video.findOne({ videoId });

    if (!video) {
      // console.warn(`[UPLOAD-COMPLETE] ⚠️ Video not found: ${videoId}`);
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      });
    }

    console.log(`[UPLOAD-COMPLETE] ✅ Video found - User: ${video.userId}, Status: ${video.status}`);

    // Verify ownership
    if (video.userId !== currentUserId) {
      // console.warn(`[UPLOAD-COMPLETE] ⚠️ Unauthorized access attempt by user: ${currentUserId}`);
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to complete this upload.',
      });
    }

    if (video.status !== 'pending') {
      // console.warn(`[UPLOAD-COMPLETE] ⚠️ Invalid status: ${video.status}, expected: pending`);
      return res.status(400).json({
        success: false,
        error: `Invalid video status: ${video.status}. Expected: pending`,
      });
    }

    // Verify the file exists in R2
    console.log(`[UPLOAD-COMPLETE] 🔍 Verifying file exists in R2: ${video.originalFile.r2Key}`);
    const fileExists = await r2Service.fileExists(R2_BUCKETS.RAW, video.originalFile.r2Key);

    if (!fileExists) {
      console.error(`[UPLOAD-COMPLETE] ❌ File not found in R2: ${video.originalFile.r2Key}`);
      return res.status(400).json({
        success: false,
        error: 'File not found in storage. Please upload the file first.',
      });
    }

    console.log(`[UPLOAD-COMPLETE] ✅ File verified in R2`);

    // Get file metadata to verify size
    console.log(`[UPLOAD-COMPLETE] 📊 Fetching file metadata...`);
    const metadata = await r2Service.getFileMetadata(R2_BUCKETS.RAW, video.originalFile.r2Key);

    if (metadata) {
      console.log(`[UPLOAD-COMPLETE] 📦 File size: ${(metadata.size / (1024 * 1024)).toFixed(2)} MB`);
    }

    // Update video status to queued
    console.log(`[UPLOAD-COMPLETE] 💾 Updating video status to 'queued'...`);
    video.status = 'queued';
    if (metadata) {
      video.originalFile.size = metadata.size;
    }
    await video.save();
    console.log(`[UPLOAD-COMPLETE] ✅ Video status updated to 'queued'`);

    // Add job to transcoding queue
    const qualities = video.userType === 'creator'
      ? ['1080p', '720p', '480p', '360p', '240p']
      : ['1080p', '720p', '480p', '360p', '240p'];

    console.log(`[UPLOAD-COMPLETE] 🎬 Adding job to ${video.userType} transcoding queue...`);
    console.log(`[UPLOAD-COMPLETE] 🎯 Qualities: ${qualities.join(', ')}`);

    const jobId = await queueService.addTranscodeJob({
      videoId: video.videoId,
      userId: video.userId,
      userType: video.userType,
      r2Key: video.originalFile.r2Key,
      qualities,
    });

    console.log(`[UPLOAD-COMPLETE] ✅ Job added to queue with ID: ${jobId}`);

    // Update video with job ID
    video.transcoding = {
      jobId,
      progress: 0,
    };
    await video.save();
    console.log(`[UPLOAD-COMPLETE] 💾 Video updated with job ID`);
    console.log(`[UPLOAD-COMPLETE] 🎉 Upload completion successful for video: ${videoId}`);

    return res.status(200).json({
      success: true,
      data: {
        videoId: video.videoId,
        status: video.status,
        jobId,
        message: 'Video upload completed. Processing started.',
      },
    });
  } catch (error) {
    console.error('[UPLOAD-COMPLETE] ❌ Error completing upload:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete upload',
    });
  }
});

/**
 * GET /api/upload/status/:videoId
 * Get video upload and processing status
 */
router.get('/status/:videoId', authenticate, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { userId: currentUserId } = ensureAuthenticatedUser(req);

    const video = await Video.findOne({ videoId });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      });
    }

    // Verify ownership
    if (video.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this video.',
      });
    }

    // Only query Redis for actively processing jobs (not queued/completed/failed)
    // This reduces Redis calls significantly - queued videos don't need real-time status
    let jobStatus = null;
    if (video.transcoding?.jobId && video.status === 'processing') {
      try {
        jobStatus = await queueService.getJobStatus(video.videoId, video.userType);
      } catch {
        // Ignore Redis errors for status checks - use cached MongoDB data
      }
    }

    return res.status(200).json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

/**
 * GET /api/upload/videos
 * Get list of all videos for the authenticated user
 */
router.get('/videos', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = ensureAuthenticatedUser(req);
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: Record<string, unknown> = { userId };
    if (status && typeof status === 'string') {
      query.status = status;
    }

    // Get videos and count
    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        videos: videos.map((video) => ({
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          status: video.status,
          thumbnail: video.thumbnail,
          duration: video.duration,
          outputs: video.outputs,
          transcoding: {
            progress: video.transcoding?.progress || 0,
            error: video.transcoding?.error,
          },
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error getting videos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get videos',
    });
  }
});

// Cache for queue stats to reduce Redis calls
let statsCache: { data: unknown; timestamp: number } | null = null;
const STATS_CACHE_TTL = 30000; // 30 seconds cache

/**
 * GET /api/upload/queue-stats
 * Get queue statistics (cached for 30 seconds to reduce Redis calls)
 */
router.get('/queue-stats', authenticate, async (_req: Request, res: Response) => {
  try {
    // Return cached stats if fresh
    if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: statsCache.data,
        cached: true,
      });
    }

    const [userStats, creatorStats] = await Promise.all([
      queueService.getQueueStats('user'),
      queueService.getQueueStats('creator'),
    ]);

    const data = {
      userQueue: userStats,
      creatorQueue: creatorStats,
    };

    // Update cache
    statsCache = { data, timestamp: Date.now() };

    return res.status(200).json({
      success: true,
      data,
      cached: false,
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue stats',
    });
  }
});

export default router;
