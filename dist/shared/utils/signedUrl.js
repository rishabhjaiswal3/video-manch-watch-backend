"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedUrl = generateSignedUrl;
exports.verifySignedUrl = verifySignedUrl;
exports.getSigningSecret = getSigningSecret;
const crypto_1 = __importDefault(require("crypto"));
// Secret key for signing URLs - must match Cloudflare Worker
const SIGNING_SECRET = process.env.VIDEO_SIGNING_SECRET || 'your-super-secret-key-change-in-production';
// Default expiration time (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;
/**
 * Generate a signed token for video access
 * Token = HMAC-SHA256(path + expires, secret)
 */
function generateSignedUrl(params) {
    const { videoId, path, expiresIn = DEFAULT_EXPIRY_SECONDS } = params;
    console.log('[SIGNED-URL] 🔐 Generating signed URL:', { videoId, path, expiresIn });
    console.log('[SIGNED-URL] 🔑 Using secret (first 8 chars):', SIGNING_SECRET.substring(0, 8) + '...');
    // Calculate expiration timestamp
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    // Create the string to sign: path|videoId|expires
    const dataToSign = `${path}|${videoId}|${expires}`;
    console.log('[SIGNED-URL] 📝 Data to sign:', dataToSign);
    // Generate HMAC-SHA256 token
    const token = crypto_1.default
        .createHmac('sha256', SIGNING_SECRET)
        .update(dataToSign)
        .digest('hex');
    // Construct signed path with query params
    const separator = path.includes('?') ? '&' : '?';
    const signedPath = `${path}${separator}token=${token}&expires=${expires}&vid=${videoId}`;
    console.log('[SIGNED-URL] ✅ Generated token:', token.substring(0, 16) + '...');
    console.log('[SIGNED-URL] 🔗 Signed path:', signedPath);
    return {
        signedPath,
        token,
        expires,
    };
}
/**
 * Verify a signed token (for backend validation if needed)
 */
function verifySignedUrl(path, videoId, token, expires) {
    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
        return false;
    }
    // Recreate the expected token
    const dataToSign = `${path}|${videoId}|${expires}`;
    const expectedToken = crypto_1.default
        .createHmac('sha256', SIGNING_SECRET)
        .update(dataToSign)
        .digest('hex');
    // Compare tokens (timing-safe comparison)
    return crypto_1.default.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
/**
 * Get the signing secret (for Cloudflare Worker setup)
 */
function getSigningSecret() {
    return SIGNING_SECRET;
}
//# sourceMappingURL=signedUrl.js.map