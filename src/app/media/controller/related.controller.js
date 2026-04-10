import { getRelatedVideos } from '../../../services/relatedVideos.js';
import { resolveStatusCode } from '../../../utils/http.js';

export async function listRelatedVideos(req, res) {
  try {
    const { videoId } = req.params;
    const { page, limit } = req.query;
    const userId = req.user?.userId || null;

    const data = await getRelatedVideos({
      videoId,
      userId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 15,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get related videos';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}
