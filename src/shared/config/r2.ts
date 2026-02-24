import { S3Client } from '@aws-sdk/client-s3';

let r2Client: S3Client | null = null;

export const getR2Client = (): S3Client => {
  if (r2Client) {
    return r2Client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not defined in environment variables');
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 does not support AWS SDK v3 automatic checksums — disable them
    // to prevent CRC32 mismatch 403s on presigned PutObject requests.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return r2Client;
};

export const R2_BUCKETS = {
  RAW: process.env.R2_BUCKET_RAW || 'video-raw-uploads',
  TRANSCODED: process.env.R2_BUCKET_TRANSCODED || 'video-transcoded',
  THUMBNAILS: process.env.R2_BUCKET_THUMBNAILS || process.env.R2_BUCKET_TRANSCODED || 'video-thumbnails',
  USER_ASSETS: process.env.R2_BUCKET_USER_ASSETS || 'user-assets',
};
