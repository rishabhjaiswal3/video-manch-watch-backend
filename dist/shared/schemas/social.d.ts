import { z } from 'zod';
export declare const createProfileSchema: z.ZodObject<{
    username: z.ZodEffects<z.ZodString, string, string>;
    displayName: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
        label: string;
    }, {
        url: string;
        label: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    username: string;
    displayName: string;
    bio?: string | undefined;
    location?: string | undefined;
    links?: {
        url: string;
        label: string;
    }[] | undefined;
}, {
    username: string;
    displayName: string;
    bio?: string | undefined;
    location?: string | undefined;
    links?: {
        url: string;
        label: string;
    }[] | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
        label: string;
    }, {
        url: string;
        label: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    links?: {
        url: string;
        label: string;
    }[] | undefined;
}, {
    displayName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    links?: {
        url: string;
        label: string;
    }[] | undefined;
}>;
export declare const uploadAssetSchema: z.ZodObject<{
    filename: z.ZodString;
    mimeType: z.ZodEffects<z.ZodString, string, string>;
    fileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename: string;
    mimeType: string;
    fileSize: number;
}, {
    filename: string;
    mimeType: string;
    fileSize: number;
}>;
export declare const createCommentSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const updateCommentSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const updateNotificationSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
}, {
    enabled: boolean;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UploadAssetInput = z.infer<typeof uploadAssetSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
//# sourceMappingURL=social.d.ts.map