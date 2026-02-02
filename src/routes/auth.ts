import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.js';
import { authenticate } from '../middleware/auth.js';
import { ensureAuthenticatedUser } from '../utils/authHelpers.js';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter as any);

/**
 * POST /api/auth/signup
 */
router.post('/signup', validate(signupSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Let MongoDB handle uniqueness - catch duplicate key error
    const user = new User({ email, password });

    try {
      await user.save();
    } catch (error: unknown) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists.',
        });
      }
      throw error;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email, user.userType);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.userType);

    // Hash refresh token before storing (security improvement)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create account.',
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const accessToken = generateAccessToken(user._id.toString(), user.email, user.userType);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.userType);

    // Hash refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed.',
    });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET is not defined');
    }

    let decoded: { userId: string; email: string; userType: 'user' | 'creator' };
    try {
      decoded = jwt.verify(refreshToken, refreshSecret) as typeof decoded;
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    // Find user and verify hashed refresh token
    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token. Please log in again.',
      });
    }

    // Compare the provided token with the hashed stored token
    const isValidToken = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token. Please log in again.',
      });
    }

    // Token rotation — new pair, old one invalidated
    const newAccessToken = generateAccessToken(user._id.toString(), user.email, user.userType);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.userType);

    // Hash and store new refresh token
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    user.refreshToken = hashedNewRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh token.',
    });
  }
});

/**
 * POST /api/auth/logout
 * SECURITY FIX: Require authentication and verify token ownership
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = ensureAuthenticatedUser(req);

    // Clear refresh token for the authenticated user only
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed.',
    });
  }
});

// --- Helpers ---

function generateAccessToken(userId: string, email: string, userType: 'user' | 'creator'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');

  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as string & jwt.SignOptions['expiresIn'];

  return jwt.sign(
    { userId, email, userType },
    secret,
    { expiresIn }
  );
}

function generateRefreshToken(userId: string, email: string, userType: 'user' | 'creator'): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not defined');

  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'];

  return jwt.sign(
    { userId, email, userType },
    secret,
    { expiresIn }
  );
}

export default router;
