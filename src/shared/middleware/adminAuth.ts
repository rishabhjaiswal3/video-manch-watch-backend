import { Request, Response, NextFunction } from 'express';
import { ensureAuthenticatedUser } from '../utils/authHelpers.js';

/**
 * Middleware that requires admin role
 * Must be used AFTER authenticate middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = ensureAuthenticatedUser(req);

    if (user.userType !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
  }
};

/**
 * Middleware that requires admin OR creator role
 * Useful for routes that should be accessible to both
 */
export const requireAdminOrCreator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const user = ensureAuthenticatedUser(req);

    if (user.userType !== 'admin' && user.userType !== 'creator') {
      res.status(403).json({
        success: false,
        error: 'Access denied. Admin or creator privileges required.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
  }
};
