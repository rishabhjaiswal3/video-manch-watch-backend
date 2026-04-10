import mongoose, { Schema } from 'mongoose';

/**
 * DiscoveryEvent — impression, click, and scroll-past tracking.
 *
 * This collection answers the question: "Was this video shown to this user,
 * and did they interact with it?" Without this you cannot:
 *   - Compute recommendation CTR (clicks / impressions)
 *   - Correct for position bias in training data (position 1 gets more clicks by default)
 *   - Build negative training examples (shown but skipped = weak negative)
 *
 * TTL: 60 days (shorter than PlaybackEvents — impressions are higher volume).
 */

const TTL_SECONDS = parseInt(process.env.DISCOVERY_EVENT_TTL_DAYS ?? '60', 10) * 86400;

const DiscoveryEventSchema = new Schema(
  {
    userId:    { type: String, index: true, default: null },
    sessionId: { type: String, required: true },

    eventType: {
      type: String,
      required: true,
      enum: ['impression', 'click', 'scroll_past'],
    },

    videoId:  { type: String, required: true, index: true },
    position: { type: Number, default: null },  // 0-indexed position in list

    // Where on the product was this shown
    page: {
      type: String,
      enum: ['home', 'trending', 'search', 'following', 'my_interest', 'recommended', 'watch_related'],
      required: true,
    },
    section: {
      type: String,
      enum: ['recommendations', 'continue_watching', 'trending_row', 'reels_row', 'main_grid', 'related_videos'],
      required: true,
    },

    // Recommendation context — allows per-model CTR breakdown
    recModelVersion: { type: String, default: null },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, versionKey: false }
);

DiscoveryEventSchema.index({ userId: 1, timestamp: -1 });
DiscoveryEventSchema.index({ videoId: 1, eventType: 1, timestamp: -1 });
DiscoveryEventSchema.index({ recModelVersion: 1, eventType: 1 });  // CTR per model
DiscoveryEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: TTL_SECONDS });

export const DiscoveryEvent = mongoose.model('DiscoveryEvent', DiscoveryEventSchema);
