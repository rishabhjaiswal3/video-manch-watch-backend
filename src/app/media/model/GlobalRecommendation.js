import mongoose, { Schema } from 'mongoose';

/**
 * GlobalRecommendation — cold-start and fallback artifacts.
 *
 * Written by the Python worker. Keyed by a string identifier so the Node API
 * can look up the right segment for a given context (contentType, genre, etc.).
 *
 * Example keys:
 *   "trending_vod"          — generic VOD trending (default fallback)
 *   "trending_reel"         — reel-specific trending
 *   "trending_genre_music"  — genre-segmented for new users with declared interests
 */
const GlobalRecommendationSchema = new Schema(
  {
    key:          { type: String, required: true },     // e.g. "trending_vod"
    videoIds:     { type: [String], default: [] },
    modelVersion: { type: String, required: true },
    generatedAt:  { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

GlobalRecommendationSchema.index({ key: 1 }, { unique: true });

export const GlobalRecommendation = mongoose.model('GlobalRecommendation', GlobalRecommendationSchema);
