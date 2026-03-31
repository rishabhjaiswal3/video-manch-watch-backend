import { getRedisConnection } from '../../../config/redis.js';
import { PLAYBACK_INGESTION, PLAYBACK_REDIS } from '../../../constants/playback.js';

const isValidId     = (v) => typeof v === 'string' && v.length >= 3 && v.length <= 128;

/**
 * POST /playback/events
 *
 * Accepts a batch of player events.
 * Auth is optional — unauthenticated events still count views (sessionId-based).
 * Only writes to Redis — no DB in the request path.
 */
export async function ingestEvents(req, res) {
  const { events } = req.body || {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
  }

  // Sanitize — drop malformed events, cap batch size
  const userId = req.user?.userId ?? null;
  const valid = events
    .slice(0, PLAYBACK_INGESTION.MAX_BATCH_SIZE)
    .filter((e) => e && PLAYBACK_INGESTION.VALID_EVENT_TYPES.has(e.type) && isValidId(e.videoId) && isValidId(e.sessionId))
    .map((e) => ({
      type:      e.type,
      videoId:   e.videoId,
      sessionId: e.sessionId,
      userId:    userId || e.userId || null,
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
      data:      e.data && typeof e.data === 'object' ? e.data : {},
    }));

  if (!valid.length) {
    return res.status(400).json({ success: false, error: 'No valid events in batch' });
  }

  try {
    const redis = getRedisConnection();
    const pipeline = redis.pipeline();
    for (const event of valid) {
      pipeline.lpush(PLAYBACK_REDIS.EVENT_QUEUE_KEY, JSON.stringify(event));
    }
    await pipeline.exec();

    return res.status(200).json({ success: true, accepted: valid.length });
  } catch (err) {
    // Never let analytics errors propagate — player should not retry on 500
    console.error('[events.controller] Redis push failed:', err.message);
    return res.status(200).json({ success: true, accepted: 0 });
  }
}
