import { Profile } from '../app/user/model/Profile.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getProfileByUserId(userId) {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  return Profile.findOne({ userId }).lean();
}

export async function getProfileData(userId) {
  const profile = await getProfileByUserId(userId);

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return profile;
}

export async function getProfileByUsername(username) {
  // TODO: implement
}

export async function updateProfile(userId, data) {
  // TODO: implement
}

export async function getCreatorVideos(userId, page, limit) {
  // TODO: implement
}

export async function isUsernameAvailable(username) {
  // TODO: implement
}
