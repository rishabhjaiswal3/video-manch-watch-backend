import { z } from 'zod';
export declare const initUploadSchema: z.ZodObject<{
    videoId: z.ZodOptional<z.ZodString>;
    filename: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    description?: string | undefined;
    videoId?: string | undefined;
}, {
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    description?: string | undefined;
    videoId?: string | undefined;
}>;
export declare const completeUploadSchema: z.ZodObject<{
    videoId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    videoId: string;
}, {
    videoId: string;
}>;
export type InitUploadInput = z.infer<typeof initUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
//# sourceMappingURL=upload.d.ts.map