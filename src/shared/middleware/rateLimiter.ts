import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 300, // 300 requests per minute (video platforms need more for signed URLs, analytics, etc.)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

// Stricter limiter for auth endpoints (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Upload limit reached. Please try again later.',
  },
});

// Higher limit for playback/stream endpoints (video players make many requests)
export const playbackLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many playback requests. Please try again later.',
  },
});

// Live stream creation limiter — 5 streams per hour
export const liveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 stream creations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Live stream creation limit reached. You can create 5 streams per hour.',
  },
});

// Live chat rate limiter — 3 messages per second
export const liveChatLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 3, // 3 messages per second
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Slow down! You are sending messages too quickly.',
  },
});
