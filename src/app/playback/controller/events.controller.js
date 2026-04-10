import { getRedisConnection } from '../../../config/redis.js';
import { PLAYBACK_INGESTION, PLAYBACK_REDIS, PLAYBACK_SOURCES } from '../../../constants/playback.js';

const isValidId     = (v) => typeof v === 'string' && v.length >= 3 && v.length <= 128;
const VALID_SOURCES = new Set(Object.values(PLAYBACK_SOURCES));

/**
 * POST /playback/events
 *
 * Accepts a batch of player events.
 * Auth is optional — unauthenticated events still count views (sessionId-based).
 * Only writes to Redis — no DB in the request path.
 *
 * New fields accepted (all optional, backward-compatible):
 *   source          — where the watch originated (recommendation|search|home_browse|...)
 *   recModelVersion — which rec model served this (only meaningful when source=recommendation)
 *   recPosition     — 0-indexed position in the rec list
 *   deviceType      — mobile|tablet|desktop
 *   clientTimestamp — unix ms when event fired on the client
 */
export async function ingestEvents(req, res) {
  const { events } = req.body || {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
  }

  const userId = req.user?.userId ?? null;
  const valid = events
    .slice(0, PLAYBACK_INGESTION.MAX_BATCH_SIZE)
    .filter((e) => e && PLAYBACK_INGESTION.VALID_EVENT_TYPES.has(e.type) && isValidId(e.videoId) && isValidId(e.sessionId))
    .map((e) => ({
      type:            e.type,
      videoId:         e.videoId,
      sessionId:       e.sessionId,
      userId:          userId || e.userId || null,
      timestamp:       typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
      data:            e.data && typeof e.data === 'object' ? e.data : {},
      // Source tracking — the key signal for recommendation quality measurement
      source:          VALID_SOURCES.has(e.source) ? e.source : 'unknown',
      recModelVersion: typeof e.recModelVersion === 'string' ? e.recModelVersion.slice(0, 64) : null,
      recPosition:     typeof e.recPosition === 'number' ? Math.max(0, Math.floor(e.recPosition)) : null,
      deviceType:      ['mobile', 'tablet', 'desktop'].includes(e.deviceType) ? e.deviceType : 'unknown',
      clientTimestamp: typeof e.clientTimestamp === 'number' ? e.clientTimestamp : null,
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
