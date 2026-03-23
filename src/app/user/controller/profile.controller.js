import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import * as profileService from '../../../services/profile.js';

export async function getProfile(req, res) {
  // TODO: implement
}

export async function getMyProfile(req, res) {
  const user = ensureAuthenticatedUser(req);
  const profile = await profileService.getProfileData(user.userId);
  return res.status(200).json({ success: true, data: profile });
}

export async function updateProfile(req, res) {
  // TODO: implement
}

export async function getProfileByUsername(req, res) {
  // TODO: implement
}

export async function getCreatorVideos(req, res) {
  // TODO: implement
}

export async function checkUsername(req, res) {
  // TODO: implement
}
