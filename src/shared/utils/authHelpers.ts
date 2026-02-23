import { Request } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedUser } from '../types/requests.js';

export const ensureAuthenticatedUser = (req: Request): AuthenticatedUser => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user;
};
