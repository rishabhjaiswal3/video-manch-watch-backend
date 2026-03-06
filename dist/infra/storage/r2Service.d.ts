export interface PresignedUrlResponse {
    uploadUrl: string;
    key: string;
    expiresIn: number;
}
export declare const r2Service: {
    /**
     * Generate a presigned URL for uploading a video directly to R2
     */
    getUploadPresignedUrl(userId: string, videoId: string, filename: string, contentType: string, userType?: "user" | "creator" | "admin", bucket?: string): Promise<PresignedUrlResponse>;
    /**
     * Generate a presigned URL for downloading/streaming a video from R2
     */
    getDownloadPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
    /**
     * Upload a file buffer directly to R2.
     */
    uploadBuffer(bucket: string, key: string, body: Buffer, contentType: string): Promise<void>;
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
     * Generate a presigned URL for uploading a thumbnail image directly to R2
     */
    getThumbnailUploadPresignedUrl(userId: string, videoId: string, mimeType: string): Promise<PresignedUrlResponse>;
    /**
     * Generate a presigned URL for uploading a category thumbnail to R2
     */
    getCategoryThumbnailPresignedUrl(categoryId: string, mimeType: string): Promise<PresignedUrlResponse>;
    /**
     * Generate a presigned URL for uploading a playlist thumbnail to R2
     */
    getPlaylistThumbnailPresignedUrl(userId: string, playlistId: string, mimeType: string): Promise<PresignedUrlResponse>;
    /**
     * Get public URL for a transcoded video
     */
    getPublicUrl(key: string): string;
};
//# sourceMappingURL=r2Service.d.ts.map