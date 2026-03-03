import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser } from '../types/requests.js';
import { getCookieValue } from '../utils/cookies.js';

interface TokenPayload {
  userId: string;
  email: string;
  userType: 'user' | 'creator' | 'admin';
  roles?: Array<'user' | 'creator' | 'admin'>;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : undefined;
  const cookieToken = getCookieValue(req, 'videomanch_access_token');
  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;
    const roleSet = new Set<'user' | 'creator' | 'admin'>(decoded.roles || []);
    roleSet.add(decoded.userType);

    const authenticatedUser: AuthenticatedUser = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType,
      roles: Array.from(roleSet),
    };

    req.user = authenticatedUser;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expired. Please refresh your token.',
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
};
