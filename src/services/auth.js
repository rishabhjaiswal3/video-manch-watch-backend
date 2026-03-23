import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../app/user/model/User.js';
import { Profile } from '../app/user/model/Profile.js';
import { getRedisConnection } from '../config/redis.js';
import {
  passwordResetOtpAttemptKey,
  passwordResetOtpBlockKey,
  passwordResetOtpCooldownKey,
  passwordResetOtpDispatchLockKey,
  passwordResetOtpIpSendCountKey,
  passwordResetOtpKey,
  passwordResetOtpSendCountKey,
  signupOtpAttemptKey,
  signupOtpBlockKey,
  signupOtpCooldownKey,
  signupOtpDispatchLockKey,
  signupOtpIpSendCountKey,
  signupOtpKey,
  signupOtpSendCountKey,
} from '../constants/auth/redisKeys.js';
import { MAX_REFRESH_SESSIONS } from '../constants/auth/login.js';
import {
  PASSWORD_RESET_OTP_DISPATCH_LOCK_MS,
  PASSWORD_RESET_OTP_EMAIL_SEND_LIMIT,
  PASSWORD_RESET_OTP_EMAIL_SEND_WINDOW_MS,
  PASSWORD_RESET_OTP_IP_SEND_LIMIT,
  PASSWORD_RESET_OTP_IP_SEND_WINDOW_MS,
  PASSWORD_RESET_OTP_LOCK_MS,
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_OTP_RESEND_COOLDOWN_MS,
  PASSWORD_RESET_OTP_TTL_MS,
} from '../constants/auth/resetPassword.js';
import {
  SIGNUP_OTP_DISPATCH_LOCK_MS,
  SIGNUP_OTP_EMAIL_SEND_LIMIT,
  SIGNUP_OTP_EMAIL_SEND_WINDOW_MS,
  SIGNUP_OTP_IP_SEND_LIMIT,
  SIGNUP_OTP_IP_SEND_WINDOW_MS,
  SIGNUP_OTP_LOCK_MS,
  SIGNUP_OTP_MAX_ATTEMPTS,
  SIGNUP_OTP_RESEND_COOLDOWN_MS,
  SIGNUP_OTP_TTL_MS,
} from '../constants/auth/signup.js';
import { sendPasswordResetOtpEmail, sendSignupOtpEmail } from './email.js';
import { generateOtp } from '../utils/otp.js';
import { parseDurationToMs } from '../utils/time.js';

const refreshTokenTtlMs = () => parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizePassword = (password) => String(password || '');
const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const assertSecrets = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  if (!process.env.REFRESH_TOKEN_SECRET) throw new Error('REFRESH_TOKEN_SECRET is not configured');
};

const buildUserPayload = (user) => ({
  userId: user._id.toString(),
  email: user.email,
  userType: user.userType,
});

const signAccessToken = (user) => {
  assertSecrets();
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      userType: user.userType,
      roles: user.roles,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const signRefreshToken = (user) => {
  assertSecrets();
  return jwt.sign(
    {
      userId: user._id.toString(),
      userType: user.userType,
      tokenId: crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

const addRefreshToken = async (user) => {
  const refreshToken = signRefreshToken(user);
  user.pruneRefreshTokens(MAX_REFRESH_SESSIONS - 1);
  user.addRefreshToken(hashToken(refreshToken), new Date(Date.now() + refreshTokenTtlMs()));
  await user.save();
  return refreshToken;
};

const issueAuthPayload = async (user) => {
  user.pruneRefreshTokens(MAX_REFRESH_SESSIONS);
  const accessToken = signAccessToken(user);
  const refreshToken = await addRefreshToken(user);

  return {
    user: buildUserPayload(user),
    accessToken,
    refreshToken,
  };
};


const getRetryAfterSeconds = async (redis, key) => {
  const ttl = await redis.ttl(key);
  return ttl > 0 ? ttl : Math.floor(SIGNUP_OTP_LOCK_MS / 1000);
};

const incrementWindowedCounter = async (redis, key, windowSeconds) => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const retryAfterSeconds = await getRetryAfterSeconds(redis, key);
  return { count, retryAfterSeconds };
};

const sanitizeUsernameBase = (value) =>
  String(value || '')
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

const generateUniqueUsername = async (email) => {
  const emailBase = email.split('@')[0];
  const base = sanitizeUsernameBase(emailBase) || `user_${crypto.randomUUID().slice(0, 8)}`;
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

const createDefaultProfile = async (user) => {
  const username = await generateUniqueUsername(user.email);
  const displayName = user.email.split('@')[0].slice(0, 50) || 'User';

  return Profile.create({
    userId: user._id.toString(),
    username,
    displayName,
  });
};

export async function requestSignupOtp(email, ipAddress = 'unknown') {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIpAddress = String(ipAddress || 'unknown').trim() || 'unknown';
  if (!normalizedEmail) throw new Error('Email is required');

  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) throw new Error('User already exists with this email');

  const redis = getRedisConnection();
  const blockKey = signupOtpBlockKey(normalizedEmail);
  const isBlocked = await redis.exists(blockKey);
  if (isBlocked) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, blockKey);
    throw new Error(`Too many invalid OTP attempts. Please try again after ${retryAfterSeconds} seconds`);
  }

  const cooldownKey = signupOtpCooldownKey(normalizedEmail);
  const hasCooldown = await redis.exists(cooldownKey);
  if (hasCooldown) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, cooldownKey);
    throw new Error(`OTP resend is temporarily locked. Please wait ${retryAfterSeconds} seconds`);
  }

  const emailSendCountKey = signupOtpSendCountKey(normalizedEmail);
  const ipSendCountKey = signupOtpIpSendCountKey(normalizedIpAddress);

  const currentEmailSendCount = parseInt((await redis.get(emailSendCountKey)) || '0', 10);
  if (currentEmailSendCount >= SIGNUP_OTP_EMAIL_SEND_LIMIT) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, emailSendCountKey);
    throw new Error(`OTP send limit reached for this email. Please try again after ${retryAfterSeconds} seconds`);
  }

  const currentIpSendCount = parseInt((await redis.get(ipSendCountKey)) || '0', 10);
  if (currentIpSendCount >= SIGNUP_OTP_IP_SEND_LIMIT) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, ipSendCountKey);
    throw new Error(`Too many OTP requests from this IP. Please try again after ${retryAfterSeconds} seconds`);
  }

  const dispatchLockKey = signupOtpDispatchLockKey(normalizedEmail);
  const lockAcquired = await redis.set(
    dispatchLockKey,
    '1',
    'EX',
    Math.ceil(SIGNUP_OTP_DISPATCH_LOCK_MS / 1000),
    'NX'
  );
  if (!lockAcquired) {
    throw new Error('OTP request already in progress. Please try again after a few minutes');
  }

  const otp = generateOtp();
  try {
    await sendSignupOtpEmail(normalizedEmail, otp);
    await redis.set(signupOtpKey(normalizedEmail), otp, 'EX', Math.floor(SIGNUP_OTP_TTL_MS / 1000));
    await redis.del(signupOtpAttemptKey(normalizedEmail));
    await redis.set(cooldownKey, '1', 'EX', Math.floor(SIGNUP_OTP_RESEND_COOLDOWN_MS / 1000));
    await incrementWindowedCounter(redis, emailSendCountKey, Math.floor(SIGNUP_OTP_EMAIL_SEND_WINDOW_MS / 1000));
    await incrementWindowedCounter(redis, ipSendCountKey, Math.floor(SIGNUP_OTP_IP_SEND_WINDOW_MS / 1000));
    return {
      ttlSeconds: Math.floor(SIGNUP_OTP_TTL_MS / 1000),
    };
  } catch (_error) {
    throw new Error('Failed to send OTP. Please try again after a few minutes');
  } finally {
    await redis.del(dispatchLockKey);
  }
}

export async function verifySignupOtpAndCreate(email, otp, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  const redis = getRedisConnection();
  const blockKey = signupOtpBlockKey(normalizedEmail);
  const attemptKey = signupOtpAttemptKey(normalizedEmail);
  const otpKey = signupOtpKey(normalizedEmail);

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const isBlocked = await redis.exists(blockKey);
  if (isBlocked) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, blockKey);
    throw new Error(`Too many invalid OTP attempts. Please try again after ${retryAfterSeconds} seconds`);
  }

  if (!normalizedPassword || normalizedPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const storedOtp = await redis.get(otpKey);
  if (!storedOtp) {
    throw new Error('Signup OTP expired or not requested');
  }

  if (storedOtp !== String(otp || '').trim()) {
    const attempts = await redis.incr(attemptKey);
    if (attempts === 1) {
      await redis.expire(attemptKey, Math.floor(SIGNUP_OTP_LOCK_MS / 1000));
    }

    if (attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
      await redis.set(blockKey, '1', 'EX', Math.floor(SIGNUP_OTP_LOCK_MS / 1000));
      await redis.del(otpKey);
      await redis.del(attemptKey);
      throw new Error('Too many invalid OTP attempts. Please try again after 1800 seconds');
    }

    throw new Error('Invalid signup OTP');
  }

  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const user = await User.create({
    email: normalizedEmail,
    password: normalizedPassword,
    userType: 'user',
  });

  await createDefaultProfile(user);
  await redis.del(otpKey);
  await redis.del(attemptKey);
  await redis.del(blockKey);

  return issueAuthPayload(user);
}

export async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Email and password are required');
  }

  const user = await User.findByEmail(normalizedEmail);
  if (!user) throw new Error('Invalid email or password');
  if (user.isBlocked) throw new Error('This account is temprory blocked,Please contact support team for assistance');

  const isValidPassword = await user.comparePassword(normalizedPassword);
  if (!isValidPassword) throw new Error('Invalid email or password');

  return issueAuthPayload(user);
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new Error('Refresh token is required');

  assertSecrets();

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      throw new Error('Invalid or expired refresh token');
    }
    throw error;
  }

  const user = await User.findById(decoded.userId);
  if (!user) throw new Error('Invalid or expired refresh token');
  if (user.isBlocked) throw new Error('This account is blocked');

  user.pruneRefreshTokens(MAX_REFRESH_SESSIONS);
  const tokenHash = hashToken(refreshToken);
  const hasToken = (user.refreshTokens || []).some((entry) => entry.tokenHash === tokenHash);
  if (!hasToken) {
    await user.save();
    throw new Error('Invalid or expired refresh token');
  }

  user.removeRefreshToken(tokenHash);
  const accessToken = signAccessToken(user);
  const nextRefreshToken = signRefreshToken(user);
  user.pruneRefreshTokens(MAX_REFRESH_SESSIONS - 1);
  user.addRefreshToken(hashToken(nextRefreshToken), new Date(Date.now() + refreshTokenTtlMs()));
  await user.save();

  return {
    user: buildUserPayload(user),
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) return { loggedOut: true };

  const tokenHash = hashToken(refreshToken);
  const user = await User.findByRefreshTokenHash(tokenHash);
  if (!user) return { loggedOut: true };

  user.removeRefreshToken(tokenHash);
  await user.save();

  return { loggedOut: true };
}


export async function requestPasswordResetOtp(role, email, ipAddress = 'unknown') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  const normalizedIpAddress = String(ipAddress || 'unknown').trim() || 'unknown';

  if (!normalizedRole) {
    throw new Error('Role is required');
  }

  if (normalizedRole !== 'user') {
    throw new Error('Unsupported role');
  }

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address');
  }

  const user = await User.findByEmail(normalizedEmail);
  if (!user) {
    throw new Error('No user found with this email');
  }

  if (user.isBlocked) {
    throw new Error('This account is blocked');
  }

  const redis = getRedisConnection();
  const blockKey = passwordResetOtpBlockKey(normalizedEmail);
  const isBlocked = await redis.exists(blockKey);
  if (isBlocked) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, blockKey);
    throw new Error(`Too many invalid OTP attempts. Please try again after ${retryAfterSeconds} seconds`);
  }

  const cooldownKey = passwordResetOtpCooldownKey(normalizedEmail);
  const hasCooldown = await redis.exists(cooldownKey);
  if (hasCooldown) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, cooldownKey);
    throw new Error(`OTP resend is temporarily locked. Please wait ${retryAfterSeconds} seconds`);
  }

  const emailSendCountKey = passwordResetOtpSendCountKey(normalizedEmail);
  const ipSendCountKey = passwordResetOtpIpSendCountKey(normalizedIpAddress);

  const currentEmailSendCount = parseInt((await redis.get(emailSendCountKey)) || '0', 10);
  if (currentEmailSendCount >= PASSWORD_RESET_OTP_EMAIL_SEND_LIMIT) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, emailSendCountKey);
    throw new Error(`OTP send limit reached for this email. Please try again after ${retryAfterSeconds} seconds`);
  }

  const currentIpSendCount = parseInt((await redis.get(ipSendCountKey)) || '0', 10);
  if (currentIpSendCount >= PASSWORD_RESET_OTP_IP_SEND_LIMIT) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, ipSendCountKey);
    throw new Error(`Too many OTP requests from this IP. Please try again after ${retryAfterSeconds} seconds`);
  }

  const dispatchLockKey = passwordResetOtpDispatchLockKey(normalizedEmail);
  const lockAcquired = await redis.set(
    dispatchLockKey,
    '1',
    'EX',
    Math.ceil(PASSWORD_RESET_OTP_DISPATCH_LOCK_MS / 1000),
    'NX'
  );
  if (!lockAcquired) {
    throw new Error('OTP request already in progress. Please try again after a few minutes');
  }

  const otp = generateOtp();
  try {
    await sendPasswordResetOtpEmail(normalizedEmail, otp);
    await redis.set(passwordResetOtpKey(normalizedEmail), otp, 'EX', Math.floor(PASSWORD_RESET_OTP_TTL_MS / 1000));
    await redis.del(passwordResetOtpAttemptKey(normalizedEmail));
    await redis.set(cooldownKey, '1', 'EX', Math.floor(PASSWORD_RESET_OTP_RESEND_COOLDOWN_MS / 1000));
    await incrementWindowedCounter(redis, emailSendCountKey, Math.floor(PASSWORD_RESET_OTP_EMAIL_SEND_WINDOW_MS / 1000));
    await incrementWindowedCounter(redis, ipSendCountKey, Math.floor(PASSWORD_RESET_OTP_IP_SEND_WINDOW_MS / 1000));

    return {
      ttlSeconds: Math.floor(PASSWORD_RESET_OTP_TTL_MS / 1000),
    };
  } catch (_error) {
    throw new Error('Failed to send OTP. Please try again after a few minutes');
  } finally {
    await redis.del(dispatchLockKey);
  }
}

export async function resetPasswordWithOtp(role, email, otp, password, currentPassword) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedRole) {
    throw new Error('Role is required');
  }

  if (normalizedRole !== 'user') {
    throw new Error('Unsupported role');
  }

  if (!normalizedEmail || !normalizedOtp || !normalizedPassword) {
    throw new Error('Email, otp, and password are required');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address');
  }

  if (normalizedPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const user = await User.findByEmail(normalizedEmail);
  if (!user) {
    throw new Error('No user found with this email');
  }

  if (user.isBlocked) {
    throw new Error('This account is blocked');
  }

  if (currentPassword) {
    const isCurrentPasswordValid = await user.comparePassword(String(currentPassword));
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is invalid');
    }
  }

  const redis = getRedisConnection();
  const blockKey = passwordResetOtpBlockKey(normalizedEmail);
  const attemptKey = passwordResetOtpAttemptKey(normalizedEmail);
  const otpKey = passwordResetOtpKey(normalizedEmail);

  const isBlocked = await redis.exists(blockKey);
  if (isBlocked) {
    const retryAfterSeconds = await getRetryAfterSeconds(redis, blockKey);
    throw new Error(`Too many invalid OTP attempts. Please try again after ${retryAfterSeconds} seconds`);
  }

  const storedOtp = await redis.get(otpKey);
  if (!storedOtp) {
    throw new Error('Password reset OTP expired or not requested');
  }

  if (storedOtp !== normalizedOtp) {
    const attempts = await redis.incr(attemptKey);
    if (attempts === 1) {
      await redis.expire(attemptKey, Math.floor(PASSWORD_RESET_OTP_LOCK_MS / 1000));
    }

    if (attempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
      await redis.set(blockKey, '1', 'EX', Math.floor(PASSWORD_RESET_OTP_LOCK_MS / 1000));
      await redis.del(otpKey);
      await redis.del(attemptKey);
      throw new Error('Too many invalid OTP attempts. Please try again after 1800 seconds');
    }

    throw new Error('Invalid password reset OTP');
  }

  user.password = normalizedPassword;
  user.refreshTokens = [];
  await user.save();

  await redis.del(otpKey);
  await redis.del(attemptKey);
  await redis.del(blockKey);
  await redis.del(passwordResetOtpCooldownKey(normalizedEmail));

  return { passwordReset: true };
}
