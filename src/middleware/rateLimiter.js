import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

export const socialMutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many social actions. Please slow down.' },
  keyGenerator: (req) => `${req.user?.userId || req.ip}:social`,
});
