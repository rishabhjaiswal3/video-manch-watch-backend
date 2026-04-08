import { getRedisConnection } from '../../../config/redis.js';

const VALID_EVENT_TYPES = new Set(['impression', 'click', 'scroll_past']);
const MAX_BATCH = 50;
const REDIS_KEY = 'discovery:events';

/**
 * POST /playback/discovery-events
 *
 * Accepts recommendation impression/click events for the feedback loop.
 * Writes to Redis list for async processing. Never fails the client.
 */
export async function ingestDiscoveryEvents(req, res) {
  const { events } = req.body || {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(200).json({ success: true, accepted: 0 });
  }

  const userId = req.user?.userId ?? null;

  const valid = events
    .slice(0, MAX_BATCH)
    .filter((e) => e && VALID_EVENT_TYPES.has(e.eventType) && e.videoId)
    .map((e) => ({
      eventType: e.eventType,
      videoId: e.videoId,
      sessionId: e.sessionId || null,
      userId,
      position: e.position ?? null,
      page: e.page || 'home',
      section: e.section || 'recommendations',
      recModelVersion: e.recModelVersion || null,
      timestamp: Date.now(),
    }));

  if (!valid.length) {
    return res.status(200).json({ success: true, accepted: 0 });
  }

  try {
    const redis = getRedisConnection();
    const pipeline = redis.pipeline();
    for (const event of valid) {
      pipeline.lpush(REDIS_KEY, JSON.stringify(event));
    }
    // Keep list bounded — trim to last 10K events
    pipeline.ltrim(REDIS_KEY, 0, 9999);
    await pipeline.exec();
  } catch (err) {
    console.error('[discovery.controller] Redis push failed:', err.message);
  }

  return res.status(200).json({ success: true, accepted: valid.length });
}
