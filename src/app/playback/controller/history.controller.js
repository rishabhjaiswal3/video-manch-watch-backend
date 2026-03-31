import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { getRedisConnection } from '../../../config/redis.js';
import * as watchHistoryService from '../../../services/watchHistory.js';

const isValidId = (v) => typeof v === 'string' && v.length >= 3 && v.length <= 128;

/**
 * GET /playback/history
 * Returns paginated watch history for the authenticated user.
 */
export async function getHistory(req, res) {
  try {
    const user  = ensureAuthenticatedUser(req);
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const data = await watchHistoryService.getHistory(user.userId, page, limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to fetch watch history';
    const status  = message.includes('Authentication') ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}

/**
 * GET /playback/progress/:videoId
 * Returns resume position for a single video.
 * Reads from Redis first (fast), falls back to MongoDB.
 */
export async function getProgress(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { videoId } = req.params;

    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: 'Invalid videoId' });
    }

    // Try Redis cache first
    const redis  = getRedisConnection();
    const cached = await redis.hgetall(`vm:progress:${user.userId}:${videoId}`);

    if (cached && cached.progressSecs !== undefined) {
      return res.status(200).json({
        success: true,
        data: {
          progressSecs:  parseInt(cached.progressSecs),
          completionPct: parseInt(cached.completionPct ?? 0),
        },
      });
    }

    // Fallback to MongoDB
    const data = await watchHistoryService.getProgress(user.userId, videoId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to fetch progress';
    const status  = message.includes('Authentication') ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
