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
    .slice(0, 100)
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
    await DiscoveryEvent.insertMany(valid, { ordered: false });
    return res.status(200).json({ success: true, accepted: valid.length });
  } catch (err) {
    console.error('[discovery.controller] insertMany failed:', err.message);
    return res.status(200).json({ success: true, accepted: 0 });
  }
}
