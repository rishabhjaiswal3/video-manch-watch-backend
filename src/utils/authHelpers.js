import { AppError } from '../middleware/errorHandler.js';

export const ensureAuthenticatedUser = (req) => {
  if (!req.user) throw new AppError('Authentication required', 401);
  return req.user;
};
