"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveChatLimiter = exports.liveLimiter = exports.playbackLimiter = exports.uploadBatchLimiter = exports.uploadLimiter = exports.otpVerifyLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// General API rate limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
    },
});
// OTP verification limiter (email + IP scoped)
// Blocks brute force attempts: 3 failed OTP verification attempts in 10 minutes.
exports.otpVerifyLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // Apply only when request includes an OTP field.
    skip: (req) => !req.body?.otp,
    keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'unknown';
        return `${req.ip}:${email}`;
    },
    message: {
        success: false,
        error: 'Too many invalid OTP attempts. Try again after 10 minutes.',
    },
});
// Upload rate limiter
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Upload limit reached. Please try again later.',
    },
});
// Batch upload init limiter
exports.uploadBatchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Bulk upload init limit reached. Please try again later.',
    },
});
// Higher limit for playback/stream endpoints (video players make many requests)
exports.playbackLimiter = (0, express_rate_limit_1.default)({
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
exports.liveLimiter = (0, express_rate_limit_1.default)({
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
exports.liveChatLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1000, // 1 second
    max: 3, // 3 messages per second
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Slow down! You are sending messages too quickly.',
    },
});
//# sourceMappingURL=rateLimiter.js.map