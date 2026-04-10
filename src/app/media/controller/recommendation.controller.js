import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import * as recommendationService from '../../../services/recommendation.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * GET /media/recommendations
 *
 * Returns a personalized ordered list of video recommendations for the authenticated user.
 * Falls back to global trending when no personalized artifact exists (cold start).
 *
 * Query params:
 *   limit       — int, default 20, max 50
 *   contentType — 'vod' | 'reel' (optional filter)
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       items: [{ ...videoFields, recPosition: number }],
 *       source: 'personalized' | 'global' | 'mixed',
 *       generatedAt: ISO string | null,
 *       modelVersion: string | null,
 *       total: number
 *     }
 *   }
 *
 * The `source` and `modelVersion` fields should be forwarded by the client
 * as `recModelVersion` on subsequent playback events — this closes the
 * recommendation → watch feedback loop.
 */
export async function getRecommendations(req, res) {
  try {
    const user  = ensureAuthenticatedUser(req);
    const limit = Math.min(50, Math.max(1, toPositiveInt(req.query.limit, 20)));
    const contentType = req.query.contentType ?? undefined;

    const data = await recommendationService.getRecommendations(user.userId, { limit, contentType });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to fetch recommendations';
    const status  = message.includes('Authentication') ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
