import { getRecommendations } from '../../../services/recommendations.js';

export async function listRecommendations(req, res) {
  try {
    const { limit, contentType } = req.query;
    const userId = req.user?.userId || null;

    const data = await getRecommendations({
      userId,
      limit: limit ? Number(limit) : 10,
      contentType: contentType || undefined,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recommendations';
    return res.status(500).json({ success: false, error: message });
  }
}
