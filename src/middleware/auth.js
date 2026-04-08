import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE } from '../constants/auth/cookies.js';
import { getCookieValue } from '../utils/cookies.js';

export const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const cookieToken = getCookieValue(req, ACCESS_COOKIE);
  const token = bearerToken || cookieToken;

  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();

    const decoded = jwt.verify(token, secret);
    const roleSet = new Set(decoded.roles || []);
    roleSet.add(decoded.userType);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType,
      roles: Array.from(roleSet),
    };
  } catch {
    // Silently ignore invalid/expired tokens for optional auth
  }
  next();
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const cookieToken = getCookieValue(req, ACCESS_COOKIE);
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const decoded = jwt.verify(token, secret);
    const roleSet = new Set(decoded.roles || []);
    roleSet.add(decoded.userType);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType,
      roles: Array.from(roleSet),
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please refresh your token.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
    return res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
};
