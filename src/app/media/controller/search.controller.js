import { searchVideos, getSearchSuggestions } from '../../../services/search.js';

export async function search(req, res) {
  try {
    const { q, contentType, page, limit } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    const userId = req.user?.userId || null;
    const data = await searchVideos({
      query: q.trim(),
      contentType: contentType || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      userId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return res.status(500).json({ success: false, error: message });
  }
}

export async function suggestions(req, res) {
  try {
    const { q, limit } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: { suggestions: [] } });
    }
    const data = await getSearchSuggestions({
      prefix: q.trim(),
      limit: limit ? Math.min(Number(limit), 15) : 8,
    });
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(200).json({ success: true, data: { suggestions: [] } });
  }
}
