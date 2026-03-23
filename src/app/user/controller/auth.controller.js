import { REFRESH_COOKIE } from '../../../constants/auth/cookies.js';
import { clearAuthCookies, getCookieValue, setAuthCookies } from '../../../utils/cookies.js';
import { resolveStatusCode } from '../../../utils/http.js';
import { parseDurationToMs } from '../../../utils/time.js';
import * as authService from '../../../services/auth.js';

export async function signup(req, res) {
  try {
    const { email, password, otp } = req.body || {};

    if (!email || !password || !otp) {
      return res.status(400).json({ success: false, error: 'Email, password, and otp are required' });
    }

    const auth = await authService.verifySignupOtpAndCreate(email, otp, password);
    setAuthCookies(res, auth, parseDurationToMs);
    return res.status(201).json({ success: true, data: auth });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    const statusCode = resolveStatusCode(
      message,
      [
        { when: (value) => value.includes('required'), status: 400 },
        { when: (value) => value.includes('exists'), status: 409 },
        { when: (value) => value.includes('blocked'), status: 403 },
        { when: (value) => value.includes('Too many invalid OTP attempts'), status: 429 },
      ],
      400
    );
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function requestSignupOtp(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await authService.requestSignupOtp(email, req.ip);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send signup OTP';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('exists'), status: 409 },
      { when: (value) => value.includes('blocked'), status: 403 },
      { when: (value) => value.includes('Please wait'), status: 429 },
      { when: (value) => value.includes('temporarily locked'), status: 429 },
      { when: (value) => value.includes('limit reached'), status: 429 },
      { when: (value) => value.includes('Too many OTP requests from this IP'), status: 429 },
      { when: (value) => value.includes('already in progress'), status: 429 },
      { when: (value) => value.includes('Failed to send OTP'), status: 503 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const auth = await authService.login(email, password);
    setAuthCookies(res, auth, parseDurationToMs);
    return res.status(200).json({ success: true, data: auth });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value === 'Invalid email or password', status: 401 },
      { when: (value) => value === 'This account is blocked' || value.includes('blocked'), status: 403 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function requestUserPasswordReset(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await authService.requestPasswordResetOtp('user', email, req.ip);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reset OTP';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('valid email'), status: 400 },
      { when: (value) => value.includes('found with this email'), status: 404 },
      { when: (value) => value.includes('blocked'), status: 403 },
      { when: (value) => value.includes('Please wait'), status: 429 },
      { when: (value) => value.includes('temporarily locked'), status: 429 },
      { when: (value) => value.includes('limit reached'), status: 429 },
      { when: (value) => value.includes('Too many OTP requests from this IP'), status: 429 },
      { when: (value) => value.includes('already in progress'), status: 429 },
      { when: (value) => value.includes('Failed to send OTP'), status: 503 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function resetUserPassword(req, res) {
  try {
    const { email, otp, password, currentPassword } = req.body || {};

    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, error: 'Email, otp, and password are required' });
    }

    const result = await authService.resetPasswordWithOtp('user', email, otp, password, currentPassword);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('valid email'), status: 400 },
      { when: (value) => value.includes('found with this email'), status: 404 },
      { when: (value) => value.includes('at least 8 characters'), status: 400 },
      { when: (value) => value.includes('Current password is invalid'), status: 401 },
      { when: (value) => value.includes('Invalid password reset OTP'), status: 400 },
      { when: (value) => value.includes('expired or not requested'), status: 400 },
      { when: (value) => value.includes('blocked'), status: 403 },
      { when: (value) => value.includes('Too many invalid OTP attempts'), status: 429 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function refresh(req, res) {
  try {
    const refreshToken = req.body?.refreshToken || getCookieValue(req, REFRESH_COOKIE);
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: 'Refresh token is required' });
    }

    const auth = await authService.refresh(refreshToken);
    setAuthCookies(res, auth, parseDurationToMs);
    return res.status(200).json({ success: true, data: auth });
  } catch (error) {
    clearAuthCookies(res);
    const message = error instanceof Error ? error.message : 'Refresh failed';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value === 'Invalid or expired refresh token' || value.includes('required'), status: 401 },
      { when: (value) => value === 'This account is blocked' || value.includes('blocked'), status: 403 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function logout(req, res) {
  try {
    const refreshToken = req.body?.refreshToken || getCookieValue(req, REFRESH_COOKIE);
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    return res.status(200).json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    clearAuthCookies(res);
    const message = error instanceof Error ? error.message : 'Logout failed';
    return res.status(500).json({ success: false, error: message });
  }
}

export { setAuthCookies, clearAuthCookies };
