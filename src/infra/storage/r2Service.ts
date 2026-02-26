import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_BUCKETS } from '../../shared/config/r2.js';

// Configurable presigned URL expiry (default: 1 hour)
const PRESIGNED_URL_EXPIRY_SECONDS = parseInt(process.env.R2_PRESIGNED_URL_EXPIRY_SECONDS || '3600', 10);


export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export const r2Service = {
  /**
   * Generate a presigned URL for uploading a video directly to R2
   */
    async getUploadPresignedUrl(
    userId: string,
    videoId: string,
    filename: string,
    contentType: string,
    userType: 'user' | 'creator' | 'admin' = 'user',
    bucket: string = R2_BUCKETS.RAW
  ): Promise<PresignedUrlResponse> {
    const client = getR2Client();
    const key = `${userType}/${userId}/${videoId}/original/${filename}`;
    const expiresIn = PRESIGNED_URL_EXPIRY_SECONDS;

    console.log(`[R2] 🔑 Generating presigned upload URL`);
    console.log(`[R2] 📂 Bucket: ${bucket}`);
    console.log(`[R2] 📁 Key: ${key}`);
    console.log(`[R2] 🧾 Content-Type (signed): ${contentType}`);
    console.log(`[R2] 🌐 Client endpoint:`, client.config.endpoint);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    console.log(`[R2] ✅ Presigned URL generated, expires in ${expiresIn}s`);

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  },

  /**
   * Generate a presigned URL for downloading/streaming a video from R2
   */
  async getDownloadPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(client, command, { expiresIn });
  },

  /**
   * Upload a file buffer directly to R2.
   */
  async uploadBuffer(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  },

  /**
   * Check if a file exists in R2
   */
  async fileExists(bucket: string, key: string): Promise<boolean> {
    const client = getR2Client();

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  },

  /**
   * Get file metadata from R2
   */
  async getFileMetadata(
    bucket: string,
    key: string
  ): Promise<{ size: number; contentType: string } | null> {
    const client = getR2Client();

    try {
      const response = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Generate a presigned URL for uploading a thumbnail image directly to R2
   */
  async getThumbnailUploadPresignedUrl(
    userId: string,
    videoId: string,
    mimeType: string
  ): Promise<PresignedUrlResponse> {
    const client = getR2Client();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `thumbnails/${userId}/${videoId}/custom.${ext}`;
    const expiresIn = 600; // 10 minutes

    const command = new PutObjectCommand({
      Bucket: R2_BUCKETS.THUMBNAILS,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { uploadUrl, key, expiresIn };
  },

  /**
   * Generate a presigned URL for uploading a category thumbnail to R2
   */
  async getCategoryThumbnailPresignedUrl(
    categoryId: string,
    mimeType: string
  ): Promise<PresignedUrlResponse> {
    const client = getR2Client();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `categories/${categoryId}/thumbnail.${ext}`;
    const expiresIn = 600;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKETS.THUMBNAILS,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { uploadUrl, key, expiresIn };
  },

  /**
   * Generate a presigned URL for uploading a playlist thumbnail to R2
   */
  async getPlaylistThumbnailPresignedUrl(
    userId: string,
    playlistId: string,
    mimeType: string
  ): Promise<PresignedUrlResponse> {
    const client = getR2Client();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `playlists/${userId}/${playlistId}/thumbnail.${ext}`;
    const expiresIn = 600;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKETS.THUMBNAILS,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { uploadUrl, key, expiresIn };
  },

  /**
   * Get public URL for a transcoded video
   */
  getPublicUrl(key: string): string {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
      throw new Error('R2_PUBLIC_URL is not defined');
    }
    return `${publicUrl}/${key}`;
  },
};
