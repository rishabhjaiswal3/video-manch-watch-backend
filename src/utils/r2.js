import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let r2Client = null;

const getR2Client = () => {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not set');
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return r2Client;
};

export const R2_USER_ASSETS_BUCKET = process.env.R2_BUCKET_USER_ASSETS || 'user-assets';

const normalizePublicBaseUrl = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  if (url.includes('.r2.cloudflarestorage.com')) return null;
  return url.replace(/\/+$/, '');
};

export const userAssetsPublicBaseUrl =
  normalizePublicBaseUrl(process.env.R2_USER_ASSETS_PUBLIC_URL) ||
  normalizePublicBaseUrl(process.env.R2_PUBLIC_URL) ||
  'https://videomanch.com';

export const uploadBuffer = async (bucket, key, body, contentType) => {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
};
