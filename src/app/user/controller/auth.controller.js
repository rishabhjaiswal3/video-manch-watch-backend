import { REFRESH_COOKIE } from '../../../constants/auth/cookies.js';
import { clearAuthCookies, getCookieValue, setAuthCookies } from '../../../utils/cookies.js';
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
    const statusCode = message.includes('required')
      ? 400
      : message.includes('exists')
      ? 409
      : message.includes('blocked')
      ? 403
      : message.includes('Too many invalid OTP attempts')
      ? 429
      : 400;
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
    const statusCode = message.includes('required')
      ? 400
      : message.includes('exists')
      ? 409
      : message.includes('blocked')
      ? 403
      : message.includes('Please wait')
      ? 429
      : message.includes('temporarily locked')
      ? 429
      : message.includes('limit reached')
      ? 429
      : message.includes('Too many OTP requests from this IP')
      ? 429
      : message.includes('already in progress')
      ? 429
      : message.includes('Failed to send OTP')
      ? 503
      : 500;
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
    const statusCode = message === 'Invalid email or password'
      ? 401
      : message === 'This account is blocked'
      ? 403
      : message.includes('required')
      ? 400
      : 500;
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
    const statusCode = message.includes('required')
      ? 400
      : message.includes('valid email')
      ? 400
      : message.includes('found with this email')
      ? 404
      : message.includes('blocked')
      ? 403
      : message.includes('Please wait')
      ? 429
      : message.includes('temporarily locked')
      ? 429
      : message.includes('limit reached')
      ? 429
      : message.includes('Too many OTP requests from this IP')
      ? 429
      : message.includes('already in progress')
      ? 429
      : message.includes('Failed to send OTP')
      ? 503
      : 500;
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
    const statusCode = message.includes('required')
      ? 400
      : message.includes('valid email')
      ? 400
      : message.includes('found with this email')
      ? 404
      : message.includes('at least 8 characters')
      ? 400
      : message.includes('Current password is invalid')
      ? 401
      : message.includes('Invalid password reset OTP')
      ? 400
      : message.includes('expired or not requested')
      ? 400
      : message.includes('blocked')
      ? 403
      : message.includes('Too many invalid OTP attempts')
      ? 429
      : 500;
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
    const statusCode = message === 'Invalid or expired refresh token' || message.includes('required')
      ? 401
      : message === 'This account is blocked'
      ? 403
      : 500;
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
