import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { resolveStatusCode } from '../../../utils/http.js';
import * as playlistService from '../../../services/playlist.js';

export async function list(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.listPlaylists(user.userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list playlists';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function create(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.createPlaylist(user.userId, req.body?.title);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function update(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.updatePlaylist(user.userId, req.params.playlistId, req.body?.title);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function get(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.getPlaylist(user.userId, req.params.playlistId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function deletePlaylist(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.deletePlaylist(user.userId, req.params.playlistId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function addVideo(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.addVideoToPlaylist(user.userId, req.params.playlistId, req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add video to playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function removeVideo(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.removeVideoFromPlaylist(user.userId, req.params.playlistId, req.params.videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove video from playlist';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getThumbnailUploadUrl(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.getThumbnailUploadUrl(user.userId, req.params.playlistId, req.body?.mimeType);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get thumbnail upload URL';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not implemented'), status: 501 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function saveThumbnail(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await playlistService.saveThumbnailUrl(user.userId, req.params.playlistId, req.body?.thumbnailUrl);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save playlist thumbnail';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}
