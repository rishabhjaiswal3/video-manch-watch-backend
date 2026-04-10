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

import { DiscoveryEvent } from '../model/DiscoveryEvent.js';
import { DISCOVERY_EVENT_TYPES } from '../../../constants/playback.js';

const isValidId = (v) => typeof v === 'string' && v.length >= 3 && v.length <= 128;

const VALID_EVENT_TYPES = new Set(Object.values(DISCOVERY_EVENT_TYPES));
const VALID_PAGES    = new Set(['home', 'trending', 'search', 'following', 'my_interest', 'recommended', 'watch_related']);
const VALID_SECTIONS = new Set(['recommendations', 'continue_watching', 'trending_row', 'reels_row', 'main_grid', 'related_videos']);

/**
 * POST /playback/discovery-events
 *
 * Accepts a batch of impression/click/scroll_past events from the frontend.
 * Written directly to MongoDB (not Redis) — lower volume than playback events,
 * and impressions need persistent storage for CTR computation.
 *
 * Auth is optional — anonymous impressions are still useful for popularity signals.
 */
export async function ingestDiscoveryEvents(req, res) {
  const { events } = req.body || {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
  }

  const userId = req.user?.userId ?? null;

  const valid = events
    .slice(0, 100)  // cap per batch — impressions are small but frequent
    .filter((e) =>
      e &&
      VALID_EVENT_TYPES.has(e.eventType) &&
      isValidId(e.videoId) &&
      isValidId(e.sessionId) &&
      VALID_PAGES.has(e.page) &&
      VALID_SECTIONS.has(e.section)
    )
    .map((e) => ({
      userId,
      sessionId:       e.sessionId,
      eventType:       e.eventType,
      videoId:         e.videoId,
      position:        typeof e.position === 'number' ? Math.max(0, Math.floor(e.position)) : null,
      page:            e.page,
      section:         e.section,
      recModelVersion: typeof e.recModelVersion === 'string' ? e.recModelVersion.slice(0, 64) : null,
      timestamp:       new Date(),
    }));

  if (!valid.length) {
    return res.status(400).json({ success: false, error: 'No valid events in batch' });
  }

  try {
    // insertMany is fire-and-forget from the client's perspective
    await DiscoveryEvent.insertMany(valid, { ordered: false });
    return res.status(200).json({ success: true, accepted: valid.length });
  } catch (err) {
    // Don't propagate — analytics failures must never break the product
    console.error('[discovery.controller] insertMany failed:', err.message);
    return res.status(200).json({ success: true, accepted: 0 });
  }
}
