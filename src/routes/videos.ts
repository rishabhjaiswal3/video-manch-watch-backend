import { Router, Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { generateSignedUrl } from '../utils/signedUrl.js';
import { getNumericEnv } from '../config/env.js';

const router = Router();

// Token expiry time (1 hour by default)
const TOKEN_EXPIRY_SECONDS = getNumericEnv('VIDEO_TOKEN_EXPIRY_SECONDS', 3600);

/**
 * Helper to generate signed URL for a video
 */
function signVideoUrl(videoId: string, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const signed = generateSignedUrl({
    videoId,
    path,
    expiresIn: TOKEN_EXPIRY_SECONDS,
  });
  return signed.signedPath;
}

/**
 * GET /api/videos
 * Get public list of completed videos (for watch app)
 * Supports filtering by contentType, pagination, and search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      contentType,
      page = '1',
      limit = '20',
      search,
      category,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Only show completed, non-deleted videos
    const query: Record<string, unknown> = {
      status: 'completed',
    };

    // Filter by content type (vod, reel)
    if (contentType && typeof contentType === 'string') {
      query.contentType = contentType;
    }

    // Search by title
    if (search && typeof search === 'string') {
      query.title = { $regex: search, $options: 'i' };
    }

    // Filter by category/genre
    if (category && typeof category === 'string' && category !== 'All') {
      query.genres = category;
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select({
          videoId: 1,
          title: 1,
          description: 1,
          thumbnail: 1,
          thumbnails: 1,
          duration: 1,
          masterPlaylistUrl: 1,
          outputs: 1,
          contentType: 1,
          tags: 1,
          genres: 1,
          createdAt: 1,
          userId: 1,
        })
        .lean(),
      Video.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        videos: videos.map((video) => ({
          id: video.videoId,
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          thumbnails: video.thumbnails,
          duration: video.duration,
          masterPlaylistUrl: video.masterPlaylistUrl,
          outputs: video.outputs,
          contentType: video.contentType || 'vod',
          tags: video.tags,
          genres: video.genres,
          createdAt: video.createdAt,
          // For display purposes
          channel: 'VideoManch Creator',
          channelAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userId}`,
          views: '0 views',
          timestamp: formatTimeAgo(video.createdAt),
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
    console.error('[VIDEOS] Error fetching videos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch videos',
    });
  }
});

/**
 * GET /api/videos/:videoId
 * Get single video details for playback
 */
router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findOne({
      videoId,
      status: 'completed',
    }).lean();

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      });
    }

    // Generate signed URL for immediate playback (no extra API call needed)
    const signedMasterPlaylistUrl = signVideoUrl(video.videoId, video.masterPlaylistUrl);

    return res.status(200).json({
      success: true,
      data: {
        id: video.videoId,
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        thumbnails: video.thumbnails,
        duration: video.duration,
        masterPlaylistUrl: video.masterPlaylistUrl,
        signedMasterPlaylistUrl, // ⚡ Pre-signed for fast playback
        outputs: video.outputs,
        contentType: video.contentType || 'vod',
        tags: video.tags,
        genres: video.genres,
        createdAt: video.createdAt,
        channel: 'VideoManch Creator',
        channelAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userId}`,
        views: '0 views',
        timestamp: formatTimeAgo(video.createdAt),
        tokenExpiresIn: TOKEN_EXPIRY_SECONDS,
      },
    });
  } catch (error) {
    console.error('[VIDEOS] Error fetching video:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch video',
    });
  }
});

/**
 * GET /api/videos/reels
 * Get reels (short-form videos)
 */
router.get('/type/reels', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reels, total] = await Promise.all([
      Video.find({
        status: 'completed',
        contentType: 'reel',
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments({
        status: 'completed',
        contentType: 'reel',
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reels: reels.map((reel) => ({
          id: reel.videoId,
          videoId: reel.videoId,
          username: 'VideoManch Creator',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.userId}`,
          description: reel.title,
          tags: reel.tags || [],
          thumbnail: reel.thumbnail,
          masterPlaylistUrl: reel.masterPlaylistUrl,
          signedMasterPlaylistUrl: signVideoUrl(reel.videoId, reel.masterPlaylistUrl), // ⚡ Pre-signed
          likes: 0,
          comments: 0,
          shares: 0,
          bookmarks: 0,
          duration: formatDuration(reel.duration || 0),
        })),
        tokenExpiresIn: TOKEN_EXPIRY_SECONDS,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[VIDEOS] Error fetching reels:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reels',
    });
  }
});

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default router;
