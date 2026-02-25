"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const r2_js_1 = require("../../shared/config/r2.js");
// Configurable presigned URL expiry (default: 1 hour)
const PRESIGNED_URL_EXPIRY_SECONDS = parseInt(process.env.R2_PRESIGNED_URL_EXPIRY_SECONDS || '3600', 10);
exports.r2Service = {
    /**
     * Generate a presigned URL for uploading a video directly to R2
     */
    async getUploadPresignedUrl(userId, videoId, filename, contentType, userType = 'user', bucket = r2_js_1.R2_BUCKETS.RAW) {
        const client = (0, r2_js_1.getR2Client)();
        const key = `${userType}/${userId}/${videoId}/original/${filename}`;
        const expiresIn = PRESIGNED_URL_EXPIRY_SECONDS;
        console.log(`[R2] 🔑 Generating presigned upload URL`);
        console.log(`[R2] 📂 Bucket: ${bucket}`);
        console.log(`[R2] 📁 Key: ${key}`);
        console.log(`[R2] 🧾 Content-Type (signed): ${contentType}`);
        console.log(`[R2] 🌐 Client endpoint:`, client.config.endpoint);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
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
    async getDownloadPresignedUrl(bucket, key, expiresIn = 3600) {
        const client = (0, r2_js_1.getR2Client)();
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
    },
    /**
     * Upload a file buffer directly to R2.
     */
    async uploadBuffer(bucket, key, body, contentType) {
        const client = (0, r2_js_1.getR2Client)();
        await client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
        }));
    },
    /**
     * Check if a file exists in R2
     */
    async fileExists(bucket, key) {
        const client = (0, r2_js_1.getR2Client)();
        try {
            await client.send(new client_s3_1.HeadObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    },
    /**
     * Get file metadata from R2
     */
    async getFileMetadata(bucket, key) {
        const client = (0, r2_js_1.getR2Client)();
        try {
            const response = await client.send(new client_s3_1.HeadObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            return {
                size: response.ContentLength || 0,
                contentType: response.ContentType || 'application/octet-stream',
            };
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return null;
            }
            throw error;
        }
    },
    /**
     * Get public URL for a transcoded video
     */
    getPublicUrl(key) {
        const publicUrl = process.env.R2_PUBLIC_URL;
        if (!publicUrl) {
            throw new Error('R2_PUBLIC_URL is not defined');
        }
        return `${publicUrl}/${key}`;
    },
};
//# sourceMappingURL=r2Service.js.map