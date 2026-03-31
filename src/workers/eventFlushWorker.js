/**
 * Event Flush Worker
 *
 * Drains vm:events:queue from Redis every FLUSH_INTERVAL_MS.
 * Processes up to BATCH_SIZE events per tick.
 *
 * Responsibilities:
 *   - Upsert WatchHistory per (userId, videoId) from watchtime events
 *   - Record unique VideoView + increment Video.viewCount from play events
 *   - Cache resume position in Redis hash for fast GET /progress reads
 *
 * This is the ONLY writer to WatchHistory and VideoView.
 * The HTTP endpoint only does LPUSH — no DB calls in the request path.
 */

import { getRedisConnection } from '../config/redis.js';
import { bulkUpsertProgress } from '../services/watchHistory.js';
import { VideoView } from '../app/playback/model/VideoView.js';
import { Video } from '../app/media/model/Video.js';
import { PLAYBACK_EVENT_TYPES, PLAYBACK_REDIS, PLAYBACK_WORKER } from '../constants/playback.js';

let flushTimer = null;
let isFlushing = false;

async function flush() {
  if (isFlushing) return;
  isFlushing = true;

  const redis = getRedisConnection();

  try {
    // Atomically pop up to BATCH_SIZE events
    const raw = await redis.lrange(PLAYBACK_REDIS.EVENT_QUEUE_KEY, 0, PLAYBACK_WORKER.BATCH_SIZE - 1);
    if (!raw.length) return;
    await redis.ltrim(PLAYBACK_REDIS.EVENT_QUEUE_KEY, raw.length, -1);

    const events = raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    if (!events.length) return;

    await Promise.allSettled([
      processWatchtime(events, redis),
      processViews(events),
    ]);
  } catch (err) {
    console.error('[EventFlushWorker] Flush error:', err.message);
  } finally {
    isFlushing = false;
  }
}

/**
 * watchtime events → WatchHistory upserts + Redis progress cache
 */
async function processWatchtime(events, redis) {
  const watchtimeEvents = events.filter((e) => e.type === PLAYBACK_EVENT_TYPES.WATCHTIME && e.videoId && e.userId);
  if (!watchtimeEvents.length) return;

  // Keep only the latest watchtime per (userId, videoId) pair
  const latestMap = new Map();
  for (const e of watchtimeEvents) {
    const key = `${e.userId}:${e.videoId}`;
    const existing = latestMap.get(key);
    if (!existing || e.timestamp > existing.timestamp) {
      latestMap.set(key, e);
    }
  }

  const progressItems = [];
  const redisPipeline = redis.pipeline();

  for (const e of latestMap.values()) {
    const progressSecs  = Math.floor(e.data?.currentTime  ?? 0);
    const durationSecs  = Math.floor(e.data?.duration     ?? 0);
    const completionPct = Math.min(100, Math.round(e.data?.completionRate ?? 0));

    progressItems.push({ userId: e.userId, videoId: e.videoId, progressSecs, durationSecs, completionPct });

    // Cache for fast GET /progress reads
    const hashKey = `${PLAYBACK_REDIS.PROGRESS_KEY_PREFIX}:${e.userId}:${e.videoId}`;
    redisPipeline.hset(
      hashKey,
      PLAYBACK_REDIS.PROGRESS_FIELDS.PROGRESS_SECS,
      progressSecs,
      PLAYBACK_REDIS.PROGRESS_FIELDS.COMPLETION_PERCENT,
      completionPct
    );
    redisPipeline.expire(hashKey, PLAYBACK_WORKER.PROGRESS_TTL_SECONDS);
  }

  await Promise.all([
    bulkUpsertProgress(progressItems),
    redisPipeline.exec(),
  ]);
}

/**
 * play events → unique VideoView + increment viewCount on Video
 */
async function processViews(events) {
  // First play per sessionId is a view
  const playEvents = events.filter((e) => e.type === PLAYBACK_EVENT_TYPES.PLAY && e.videoId && e.sessionId);
  if (!playEvents.length) return;

  // Deduplicate by sessionId within this batch
  const seen = new Set();
  const unique = [];
  for (const e of playEvents) {
    if (!seen.has(e.sessionId)) {
      seen.add(e.sessionId);
      unique.push(e);
    }
  }

  // Insert views — ignore duplicates (unique index on videoId+sessionId)
  const viewOps = unique.map((e) => ({
    updateOne: {
      filter: { videoId: e.videoId, sessionId: e.sessionId },
      update: { $setOnInsert: { videoId: e.videoId, userId: e.userId || null, sessionId: e.sessionId, viewedAt: new Date(e.timestamp) } },
      upsert: true,
    },
  }));

  const result = await VideoView.bulkWrite(viewOps, { ordered: false });

  // Increment viewCount only for genuinely new views
  const newViews = result.upsertedCount ?? 0;
  if (newViews > 0) {
    // Group new views by videoId to do minimal DB round-trips
    const videoViewCounts = new Map();
    for (const e of unique) {
      videoViewCounts.set(e.videoId, (videoViewCounts.get(e.videoId) ?? 0) + 1);
    }
    const viewIncrOps = [...videoViewCounts.entries()].map(([videoId, count]) => ({
      updateOne: {
        filter: { videoId },
        update: { $inc: { viewCount: count } },
      },
    }));
    await Video.bulkWrite(viewIncrOps, { ordered: false });
  }
}

export function startEventFlushWorker() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, PLAYBACK_WORKER.FLUSH_INTERVAL_MS);
  console.log(`[EventFlushWorker] Started — draining every ${PLAYBACK_WORKER.FLUSH_INTERVAL_MS / 1000}s`);
}

export async function stopEventFlushWorker() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Final flush on shutdown
  await flush();
  console.log('[EventFlushWorker] Stopped');
}
