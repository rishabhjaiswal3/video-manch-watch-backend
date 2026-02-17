export interface PresignedUrlResponse {
    uploadUrl: string;
    key: string;
    expiresIn: number;
}
export declare const r2Service: {
    /**
     * Generate a presigned URL for uploading a video directly to R2
     */
    getUploadPresignedUrl(userId: string, videoId: string, filename: string, contentType: string, userType?: "user" | "creator" | "admin"): Promise<PresignedUrlResponse>;
    /**
     * Generate a presigned URL for downloading/streaming a video from R2
     */
    getDownloadPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
    /**
     * Check if a file exists in R2
     */
    fileExists(bucket: string, key: string): Promise<boolean>;
    /**
     * Get file metadata from R2
     */
    getFileMetadata(bucket: string, key: string): Promise<{
        size: number;
        contentType: string;
    } | null>;
    /**
     * Get public URL for a transcoded video
     */
    getPublicUrl(key: string): string;
};
//# sourceMappingURL=r2Service.d.ts.map