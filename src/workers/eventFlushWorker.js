/**
 * Event Flush Worker
 *
 * Drains vm:events:queue from Redis every FLUSH_INTERVAL_MS.
 * Processes up to BATCH_SIZE events per tick.
 *
 * Responsibilities:
 *   1. Upsert WatchHistory per (userId, videoId) from watchtime events
 *   2. Record unique VideoView + increment Video.viewCount from play events
 *   3. Cache resume position in Redis hash for fast GET /progress reads
 *   4. Persist raw PlaybackEvent documents (append-only, training data store)
 *
 * This is the ONLY writer to WatchHistory, VideoView, and PlaybackEvent.
 * The HTTP endpoint only does LPUSH — no DB calls in the request path.
 */

import { getRedisConnection } from '../config/redis.js';
import { bulkRegisterStartedHistory, bulkUpsertProgress } from '../services/watchHistory.js';
import { VideoView } from '../app/playback/model/VideoView.js';
import { PlaybackEvent } from '../app/playback/model/PlaybackEvent.js';
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
      processRawEvents(events),       // ← new: raw append-only store for ML
      processStartedHistory(events),
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
 * Persist every event as a raw PlaybackEvent document (append-only).
 * This is the training corpus for ML models — never upserted, never deleted
 * except by the TTL index.
 */
async function processRawEvents(events) {
  const docs = events.map((e) => ({
    userId:          e.userId || null,
    sessionId:       e.sessionId,
    videoId:         e.videoId,
    eventType:       mapEventType(e.type),
    progressSecs:    Math.floor(e.data?.currentTime ?? 0),
    durationSecs:    Math.floor(e.data?.duration ?? 0),
    completionPct:   Math.min(100, Math.round(e.data?.completionRate ?? 0)),
    source:          e.source || 'unknown',
    recModelVersion: e.recModelVersion || null,
    recPosition:     typeof e.recPosition === 'number' ? e.recPosition : null,
    deviceType:      e.deviceType || 'unknown',
    data:            e.data || {},
    clientTimestamp: e.clientTimestamp ? new Date(e.clientTimestamp) : null,
    serverTimestamp: new Date(),
  }));

  // insertMany with ordered:false — partial failure is acceptable
  await PlaybackEvent.insertMany(docs, { ordered: false }).catch((err) => {
    // BulkWriteError on dupes (none expected here) or validation — log and continue
    console.warn('[EventFlushWorker] processRawEvents partial failure:', err.message);
  });
}

/**
 * Map Redis queue event type strings to PlaybackEvent enum values.
 * The queue uses the legacy type names; the DB model uses the expanded set.
 */
function mapEventType(type) {
  const map = {
    play:               'play',
    pause:              'pause',
    seek:               'seek',
    seek_end:           'seek_end',
    quality_change:     'quality_change',
    buffer:             'buffer',
    buffer_start:       'buffer_start',
    ended:              'ended',
    error:              'error',
    heartbeat:          'heartbeat',
    watchtime:          'watchtime',
    progress:           'watchtime',   // alias
    speed_change:       'speed_change',
    player_init:        'player_init',
    player_destroy:     'player_destroy',
    stream_interrupted: 'stream_interrupted',
    stream_resumed:     'stream_resumed',
  };
  return map[type] ?? 'watchtime';
}

/**
 * play events → create/update a basic WatchHistory row for authenticated users
 * even before the later watchtime/progress event arrives.
 */
async function processStartedHistory(events) {
  const startedEvents = events.filter((e) => e.type === PLAYBACK_EVENT_TYPES.PLAY && e.videoId && e.userId);
  if (!startedEvents.length) return;

  const latestMap = new Map();
  for (const event of startedEvents) {
    const key = `${event.userId}:${event.videoId}`;
    const existing = latestMap.get(key);
    if (!existing || event.timestamp > existing.timestamp) {
      latestMap.set(key, event);
    }
  }

  await bulkRegisterStartedHistory(
    [...latestMap.values()].map((event) => ({
      userId:    event.userId,
      videoId:   event.videoId,
      watchedAt: event.timestamp,
    }))
  );
}

/**
 * watchtime events → WatchHistory upserts + Redis progress cache
 */
async function processWatchtime(events, redis) {
  const watchtimeEvents = events.filter((e) => e.type === PLAYBACK_EVENT_TYPES.WATCHTIME && e.videoId && e.userId);
  if (!watchtimeEvents.length) return;

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
  const playEvents = events.filter((e) => e.type === PLAYBACK_EVENT_TYPES.PLAY && e.videoId && e.sessionId);
  if (!playEvents.length) return;

  const seen = new Set();
  const unique = [];
  for (const e of playEvents) {
    if (!seen.has(e.sessionId)) {
      seen.add(e.sessionId);
      unique.push(e);
    }
  }

  const viewOps = unique.map((e) => ({
    updateOne: {
      filter: { videoId: e.videoId, sessionId: e.sessionId },
      update: { $setOnInsert: { videoId: e.videoId, userId: e.userId || null, sessionId: e.sessionId, viewedAt: new Date(e.timestamp) } },
      upsert: true,
    },
  }));

  const result = await VideoView.bulkWrite(viewOps, { ordered: false });

  const newViews = result.upsertedCount ?? 0;
  if (newViews > 0) {
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
  await flush();
  console.log('[EventFlushWorker] Stopped');
}
