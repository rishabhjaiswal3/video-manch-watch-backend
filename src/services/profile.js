import crypto from 'crypto';
import { Profile } from '../app/user/model/Profile.js';
import { User } from '../app/user/model/User.js';
import { AppError } from '../middleware/errorHandler.js';

const normalizeString = (value) => String(value || '').trim();
const normalizeUsername = (username) => normalizeString(username).toLowerCase();
const allowedGenders = new Set(['male', 'female', 'other', 'prefer_not_to_reveal']);
const usernamePattern = /^[a-z0-9_]{3,30}$/;

const sanitizeUsernameBase = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

const buildUsernameCandidate = (base, suffix = '') => {
  if (!suffix) {
    return base.slice(0, 30);
  }

  const normalizedSuffix = String(suffix).toLowerCase();
  const trimmedBase = base.slice(0, Math.max(3, 30 - normalizedSuffix.length - 1));
  return `${trimmedBase}_${normalizedSuffix}`;
};

const generateUsernameSuffix = (length = 4) =>
  crypto.randomBytes(length)
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, length);

const generateUniqueUsername = async (seed) => {
  const base = sanitizeUsernameBase(seed) || `user_${crypto.randomUUID().slice(0, 8)}`;
  const directCandidate = buildUsernameCandidate(base);

  if (!(await Profile.isUsernameTaken(directCandidate))) {
    return directCandidate;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildUsernameCandidate(base, generateUsernameSuffix());
    if (!(await Profile.isUsernameTaken(candidate))) {
      return candidate;
    }
  }

  return buildUsernameCandidate(`user_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`);
};

export const createDefaultProfileForUser = async (userId, fallbackData = {}) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const emailPrefix = user.email?.split('@')[0] || 'user';
  const requestedUsername = normalizeUsername(fallbackData.username);
  let username = requestedUsername;

  if (!username || !usernamePattern.test(username)) {
    username = await generateUniqueUsername(emailPrefix);
  } else {
    const existingProfile = await Profile.findOne({ username }).lean();
    if (existingProfile && existingProfile.userId !== userId) {
      username = await generateUniqueUsername(emailPrefix);
    }
  }

  const displayName = normalizeString(fallbackData.displayName) || emailPrefix.slice(0, 50) || 'User';
  const gender = normalizeString(fallbackData.gender);
  const bio = normalizeString(fallbackData.bio);

  return Profile.create({
    userId,
    username,
    displayName,
    gender: allowedGenders.has(gender) ? gender : 'prefer_not_to_reveal',
    bio: bio || undefined,
  });
};

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
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new AppError('Username is required', 400);
  }

  const profile = await Profile.findOne({ username: normalizedUsername }).lean();
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return profile;
}

export async function updateProfile(userId, data) {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await createDefaultProfileForUser(userId, data || {});
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(data || {}, 'username')) {
    const username = normalizeUsername(data.username);
    if (!username) {
      throw new AppError('Username is required', 400);
    }
    if (!usernamePattern.test(username)) {
      throw new AppError('Username must be 3-30 characters and contain only letters, numbers, and underscores', 400);
    }

    const existingProfile = await Profile.findOne({ username }).lean();
    if (existingProfile && existingProfile.userId !== userId) {
      throw new AppError('Username is already taken', 409);
    }

    updates.username = username;
  }

  if (Object.prototype.hasOwnProperty.call(data || {}, 'displayName')) {
    const displayName = normalizeString(data.displayName);
    if (!displayName) {
      throw new AppError('Display name is required', 400);
    }
    if (displayName.length > 50) {
      throw new AppError('Display name must be 50 characters or fewer', 400);
    }
    updates.displayName = displayName;
  }

  if (Object.prototype.hasOwnProperty.call(data || {}, 'gender')) {
    const gender = normalizeString(data.gender);
    if (gender && !allowedGenders.has(gender)) {
      throw new AppError('Invalid gender value', 400);
    }
    updates.gender = gender || 'prefer_not_to_reveal';
  }

  if (Object.prototype.hasOwnProperty.call(data || {}, 'bio')) {
    const bio = normalizeString(data.bio);
    if (bio.length > 500) {
      throw new AppError('Bio must be 500 characters or fewer', 400);
    }
    updates.bio = bio || undefined;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No profile fields provided to update', 400);
  }

  Object.assign(profile, updates);
  await profile.save();

  return profile.toObject();
}

export async function getCreatorVideos(userId, page, limit) {
  // TODO: implement
}

export async function isUsernameAvailable(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new AppError('Username is required', 400);
  }

  if (!usernamePattern.test(normalizedUsername)) {
    return false;
  }

  return !(await Profile.isUsernameTaken(normalizedUsername));
}
