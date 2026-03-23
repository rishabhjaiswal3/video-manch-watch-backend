import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { resolveStatusCode } from '../../../utils/http.js';
import * as watchLaterService from '../../../services/watchLater.js';

export async function add(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await watchLaterService.add(user.userId, req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add watch later video';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function remove(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await watchLaterService.remove(user.userId, req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove watch later video';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getList(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await watchLaterService.getList(user.userId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get watch later list';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getStatus(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await watchLaterService.getStatus(user.userId, req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get watch later status';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}
