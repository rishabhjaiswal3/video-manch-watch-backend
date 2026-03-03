export interface SignedUrlParams {
    videoId: string;
    path: string;
    expiresIn?: number;
    /** Optional device type string; used to generate proof for mobile playback */
    deviceType?: string;
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
export declare function generateSignedUrl(params: SignedUrlParams): SignedUrlResult;
/**
 * Verify a signed token (for backend validation if needed)
 */
export declare function verifySignedUrl(path: string, videoId: string, token: string, expires: number): boolean;
/**
 * Get the signing secret (for Cloudflare Worker setup)
 */
export declare function getSigningSecret(): string;
//# sourceMappingURL=signedUrl.d.ts.map