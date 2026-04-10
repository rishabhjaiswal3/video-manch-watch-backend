import mongoose, { Schema } from 'mongoose';

/**
 * UserRecommendation — precomputed ordered videoId list per user.
 *
 * Written exclusively by the Python recommendation worker (video-manch-recommendation-system).
 * The Node API reads this artifact and applies real-time eligibility filters before serving.
 *
 * Write semantics: replaceOne with upsert:true per user batch — always a full replacement.
 * Schema must match exactly what the Python worker writes (camelCase field names).
 */
const UserRecommendationSchema = new Schema(
  {
    userId: { type: String, required: true },

    // Ordered best-first list of videoIds. Capped at OUTPUT_SIZE (default 200) in the worker.
    // Node serves only the top `limit` after filtering — extra rows act as a filter buffer.
    videoIds: { type: [String], default: [] },

    // Optional parallel scores for debugging / reranking experiments.
    // Omitted from API responses unless REC_EXPOSE_SCORES=true.
    scores: { type: [Number], default: undefined },

    // Algorithm identifier — bump on every algo change for A/B comparison.
    modelVersion: { type: String, required: true },

    // When the worker generated this artifact. Used for staleness alerts.
    generatedAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

UserRecommendationSchema.index({ userId: 1 }, { unique: true });

export const UserRecommendation = mongoose.model('UserRecommendation', UserRecommendationSchema);
