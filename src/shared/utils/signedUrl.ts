import crypto from 'crypto';

// Secret key for signing URLs - must match Cloudflare Worker
const _rawSecret = process.env.VIDEO_SIGNING_SECRET;
if (!_rawSecret) {
  throw new Error('[SIGNED-URL] VIDEO_SIGNING_SECRET environment variable is not set. Refusing to start.');
}
const SIGNING_SECRET: string = _rawSecret;

// Default expiration time (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

export interface SignedUrlParams {
  videoId: string;
  path: string;
  expiresIn?: number; // seconds
}

export interface SignedUrlResult {
  signedPath: string;
  token: string;
  expires: number;
}

/**
 * Generate a signed token for video access
 * Token = HMAC-SHA256(path + expires, secret)
 */
export function generateSignedUrl(params: SignedUrlParams): SignedUrlResult {
  const { videoId, path, expiresIn = DEFAULT_EXPIRY_SECONDS } = params;

  // Calculate expiration timestamp
  const expires = Math.floor(Date.now() / 1000) + expiresIn;

  // Create the string to sign: path|videoId|expires
  const dataToSign = `${path}|${videoId}|${expires}`;

  // Generate HMAC-SHA256 token
  const token = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(dataToSign)
    .digest('hex');

  // Construct signed path with query params
  const separator = path.includes('?') ? '&' : '?';
  const signedPath = `${path}${separator}token=${token}&expires=${expires}&vid=${videoId}`;

  return {
    signedPath,
    token,
    expires,
  };
}

/**
 * Verify a signed token (for backend validation if needed)
 */
export function verifySignedUrl(
  path: string,
  videoId: string,
  token: string,
  expires: number
): boolean {
  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    return false;
  }

  // Recreate the expected token
  const dataToSign = `${path}|${videoId}|${expires}`;
  const expectedToken = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(dataToSign)
    .digest('hex');

  // Compare tokens (timing-safe comparison)
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}

/**
 * Get the signing secret (for Cloudflare Worker setup)
 */
export function getSigningSecret(): string {
  return SIGNING_SECRET;
}
