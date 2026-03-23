import * as videoService from '../../../services/video.js';
import { resolveStatusCode } from '../../../utils/http.js';

export async function registerVod(req, res) {
  try {
    const data = await videoService.registerVOD(req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register video';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function listVideos(req, res) {
  try {
    const data = await videoService.listVideos(req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list videos';
    return res.status(500).json({ success: false, error: message });
  }
}

export async function getVideo(req, res) {
  try {
    const data = await videoService.getVideoById(req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get video';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function listReels(req, res) {
  try {
    const data = await videoService.listReels(req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list reels';
    return res.status(500).json({ success: false, error: message });
  }
}
