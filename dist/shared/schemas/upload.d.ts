import { z } from 'zod';
export declare const initUploadSchema: z.ZodObject<{
    videoId: z.ZodOptional<z.ZodString>;
    filename: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>>;
    contentType: z.ZodOptional<z.ZodEnum<["vod", "reel", "live"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    tags: string[];
    filename: string;
    mimeType: string;
    fileSize: number;
    description?: string | undefined;
    videoId?: string | undefined;
    contentType?: "vod" | "live" | "reel" | undefined;
}, {
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    description?: string | undefined;
    videoId?: string | undefined;
    tags?: string[] | undefined;
    contentType?: "vod" | "live" | "reel" | undefined;
}>;
export declare const completeUploadSchema: z.ZodObject<{
    videoId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    videoId: string;
}, {
    videoId: string;
}>;
export declare const initUploadBatchSchema: z.ZodObject<{
    idempotencyKey: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        videoId: z.ZodOptional<z.ZodString>;
        filename: z.ZodString;
        fileSize: z.ZodNumber;
        mimeType: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodEffects<z.ZodString, string, string>;
        description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>>;
        contentType: z.ZodOptional<z.ZodEnum<["vod", "reel", "live"]>>;
    } & {
        clientId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        tags: string[];
        filename: string;
        mimeType: string;
        fileSize: number;
        clientId: string;
        description?: string | undefined;
        videoId?: string | undefined;
        contentType?: "vod" | "live" | "reel" | undefined;
    }, {
        title: string;
        filename: string;
        mimeType: string;
        fileSize: number;
        clientId: string;
        description?: string | undefined;
        videoId?: string | undefined;
        tags?: string[] | undefined;
        contentType?: "vod" | "live" | "reel" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        title: string;
        tags: string[];
        filename: string;
        mimeType: string;
        fileSize: number;
        clientId: string;
        description?: string | undefined;
        videoId?: string | undefined;
        contentType?: "vod" | "live" | "reel" | undefined;
    }[];
    idempotencyKey?: string | undefined;
}, {
    items: {
        title: string;
        filename: string;
        mimeType: string;
        fileSize: number;
        clientId: string;
        description?: string | undefined;
        videoId?: string | undefined;
        tags?: string[] | undefined;
        contentType?: "vod" | "live" | "reel" | undefined;
    }[];
    idempotencyKey?: string | undefined;
}>;
export declare const updateVideoSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    tags: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    contentType: z.ZodOptional<z.ZodEnum<["vod", "reel", "live"]>>;
    thumbnail: z.ZodOptional<z.ZodString>;
    isDownloadable: z.ZodOptional<z.ZodBoolean>;
    isAdultContent: z.ZodOptional<z.ZodBoolean>;
    allowLikes: z.ZodOptional<z.ZodBoolean>;
    allowDislikes: z.ZodOptional<z.ZodBoolean>;
    allowComments: z.ZodOptional<z.ZodBoolean>;
    visibility: z.ZodOptional<z.ZodEnum<["listed", "unlisted"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    title?: string | undefined;
    thumbnail?: string | undefined;
    tags?: string[] | undefined;
    contentType?: "vod" | "live" | "reel" | undefined;
    isAdultContent?: boolean | undefined;
    isDownloadable?: boolean | undefined;
    visibility?: "listed" | "unlisted" | undefined;
    allowLikes?: boolean | undefined;
    allowDislikes?: boolean | undefined;
    allowComments?: boolean | undefined;
}, {
    description?: string | undefined;
    title?: string | undefined;
    thumbnail?: string | undefined;
    tags?: string[] | undefined;
    contentType?: "vod" | "live" | "reel" | undefined;
    isAdultContent?: boolean | undefined;
    isDownloadable?: boolean | undefined;
    visibility?: "listed" | "unlisted" | undefined;
    allowLikes?: boolean | undefined;
    allowDislikes?: boolean | undefined;
    allowComments?: boolean | undefined;
}>;
export declare const thumbnailUrlSchema: z.ZodObject<{
    mimeType: z.ZodEnum<["image/jpeg", "image/png", "image/webp"]>;
}, "strip", z.ZodTypeAny, {
    mimeType: "image/png" | "image/webp" | "image/jpeg";
}, {
    mimeType: "image/png" | "image/webp" | "image/jpeg";
}>;
export type InitUploadInput = z.infer<typeof initUploadSchema>;
export type InitUploadBatchInput = z.infer<typeof initUploadBatchSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type ThumbnailUrlInput = z.infer<typeof thumbnailUrlSchema>;
//# sourceMappingURL=upload.d.ts.map