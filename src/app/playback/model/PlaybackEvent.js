import mongoose, { Schema } from 'mongoose';

/**
 * PlaybackEvent — raw append-only event store.
 *
 * Every player event is persisted here in addition to the Redis queue.
 * This collection is the training source for ML models and is never upserted —
 * each row is immutable. WatchHistory remains the aggregated view for fast API reads.
 *
 * TTL: 90 days by default (configurable via PLAYBACK_EVENT_TTL_DAYS env var).
 * After 90 days events are already reflected in WatchHistory; the raw rows
 * are only needed for model training windows.
 */

const TTL_SECONDS = parseInt(process.env.PLAYBACK_EVENT_TTL_DAYS ?? '90', 10) * 86400;

const PlaybackEventSchema = new Schema(
  {
    // Identity
    userId:    { type: String, index: true, default: null },  // null for unauthenticated
    sessionId: { type: String, required: true, index: true },
    videoId:   { type: String, required: true, index: true },

    // Event classification
    eventType: {
      type: String,
      required: true,
      enum: [
        'play', 'pause', 'resume', 'seek', 'seek_end',
        'ended', 'abandon', 'watchtime', 'heartbeat',
        'quality_change', 'speed_change', 'buffer', 'buffer_start',
        'error', 'player_init', 'player_destroy',
        'stream_interrupted', 'stream_resumed',
      ],
    },

    // Progress at time of event
    progressSecs:  { type: Number, default: 0 },
    durationSecs:  { type: Number, default: 0 },
    completionPct: { type: Number, default: 0, min: 0, max: 100 },

    // === THE CRITICAL FIELD ===
    // Where did this watch originate? Without this you cannot compute
    // recommendation CTR or build unbiased training data.
    source: {
      type: String,
      enum: [
        'recommendation',  // came from the personalized rec rail
        'search',          // came from search results
        'home_browse',     // browsed main grid on home
        'trending',        // from trending page
        'following',       // from subscriptions/following feed
        'watch_later',     // from watch-later list
        'history',         // resumed from history
        'direct',          // direct URL / external link
        'related',         // related videos on watch page
        'reels',           // from reels feed
        'unknown',
      ],
      default: 'unknown',
    },

    // Recommendation context (only when source === 'recommendation')
    recModelVersion: { type: String, default: null },
    recPosition:     { type: Number, default: null },  // 0-indexed rank in served list

    // Client context
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown',
    },

    // Raw extra payload from the player event (seek targets, quality labels, etc.)
    data: { type: Schema.Types.Mixed, default: {} },

    // Timing
    clientTimestamp: { type: Date, default: null },  // when event fired on client
    serverTimestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, versionKey: false }
);

// Composite indexes for training queries
PlaybackEventSchema.index({ userId: 1, serverTimestamp: -1 });
PlaybackEventSchema.index({ videoId: 1, eventType: 1, serverTimestamp: -1 });
PlaybackEventSchema.index({ source: 1, serverTimestamp: -1 });

// TTL — auto-expire raw events after window
PlaybackEventSchema.index({ serverTimestamp: 1 }, { expireAfterSeconds: TTL_SECONDS });

export const PlaybackEvent = mongoose.model('PlaybackEvent', PlaybackEventSchema);
