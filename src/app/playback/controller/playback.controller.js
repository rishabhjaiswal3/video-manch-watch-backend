import * as playbackService from '../../../services/playback.js';
import { resolveStatusCode } from '../../../utils/http.js';

export async function getSignedStream(req, res) {
  try {
    const data = await playbackService.getSignedStream(
      req.params.videoId,
      req.headers['x-vm-device-type']
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get signed stream URL';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
      { when: (value) => value.includes('no playlist'), status: 404 },
    ]);

    return res.status(statusCode).json({ success: false, error: message });
  }
}
