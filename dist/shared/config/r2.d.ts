import { S3Client } from '@aws-sdk/client-s3';
export declare const getR2Client: () => S3Client;
export declare const R2_BUCKETS: {
    RAW: string;
    TRANSCODED: string;
    THUMBNAILS: string;
    USER_ASSETS: string;
};
//# sourceMappingURL=r2.d.ts.map