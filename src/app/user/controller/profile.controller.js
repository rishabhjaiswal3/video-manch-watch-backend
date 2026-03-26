import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { resolveStatusCode } from '../../../utils/http.js';
import * as profileService from '../../../services/profile.js';

export async function getProfile(req, res) {
  try {
    const profile = await profileService.getProfileData(req.params.userId);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getMyProfile(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const profile = await profileService.getProfileData(user.userId);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('Profile not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function updateProfile(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const profile = await profileService.updateProfile(user.userId, req.body || {});
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('not found'), status: 404 },
      { when: (value) => value.includes('taken'), status: 409 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('Invalid'), status: 400 },
      { when: (value) => value.includes('must be'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getProfileByUsername(req, res) {
  try {
    const profile = await profileService.getProfileByUsername(req.params.username);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getCreatorVideos(req, res) {
  try {
    const data = await profileService.getCreatorVideos(req.params.userId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch creator videos';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function checkUsername(req, res) {
  try {
    const available = await profileService.isUsernameAvailable(req.params.username);
    return res.status(200).json({ success: true, data: { available } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check username';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}
