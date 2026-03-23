import crypto from 'crypto';

const DEFAULT_EXPIRY_SECONDS = 3600;

export function generateSignedUrl({ videoId, path, expiresIn = DEFAULT_EXPIRY_SECONDS, deviceType }) {
  const secret = process.env.VIDEO_SIGNING_SECRET;
  if (!secret) {
    throw new Error('VIDEO_SIGNING_SECRET is not configured');
  }

  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const dataToSign = `${path}|${videoId}|${expires}`;
  const token = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

  const separator = path.includes('?') ? '&' : '?';
  let signedPath = `${path}${separator}token=${token}&expires=${expires}&vid=${videoId}`;

  const deviceSecret = process.env.VIDEO_DEVICE_SECRET;
  if (deviceSecret) {
    const dt = deviceType || 'web';
    const dts = Math.floor(Date.now() / 1000);
    const proofData = `${path}|${videoId}|${dt}|${dts}`;
    const dproof = crypto.createHmac('sha256', deviceSecret).update(proofData).digest('hex');
    signedPath += `&dt=${encodeURIComponent(dt)}&dts=${dts}&dproof=${dproof}`;
  }

  return { signedPath, token, expires };
}
