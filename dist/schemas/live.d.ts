import { z } from 'zod';
export declare const createLiveStreamSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    recordingEnabled: z.ZodDefault<z.ZodBoolean>;
    chatEnabled: z.ZodDefault<z.ZodBoolean>;
    isAdultContent: z.ZodDefault<z.ZodBoolean>;
    scheduledAt: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    title: string;
    isAdultContent: boolean;
    recordingEnabled: boolean;
    chatEnabled: boolean;
    description?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
    scheduledAt?: Date | undefined;
}, {
    title: string;
    description?: string | undefined;
    tags?: string[] | undefined;
    isAdultContent?: boolean | undefined;
    category?: string | undefined;
    scheduledAt?: string | undefined;
    recordingEnabled?: boolean | undefined;
    chatEnabled?: boolean | undefined;
}>;
export declare const updateLiveStreamSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    chatEnabled: z.ZodOptional<z.ZodBoolean>;
    isAdultContent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    title?: string | undefined;
    tags?: string[] | undefined;
    isAdultContent?: boolean | undefined;
    category?: string | undefined;
    chatEnabled?: boolean | undefined;
}, {
    description?: string | undefined;
    title?: string | undefined;
    tags?: string[] | undefined;
    isAdultContent?: boolean | undefined;
    category?: string | undefined;
    chatEnabled?: boolean | undefined;
}>;
export declare const sendChatMessageSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export declare const validateStreamKeySchema: z.ZodObject<{
    streamKey: z.ZodString;
    app: z.ZodOptional<z.ZodString>;
    tcUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    streamKey: string;
    app?: string | undefined;
    tcUrl?: string | undefined;
}, {
    streamKey: string;
    app?: string | undefined;
    tcUrl?: string | undefined;
}>;
export declare const streamIdParamSchema: z.ZodObject<{
    streamId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    streamId: string;
}, {
    streamId: string;
}>;
export declare const listStreamsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    category: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["created", "ready", "live", "ended", "failed"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "ready" | "failed" | "live" | "ended" | "created" | undefined;
    category?: string | undefined;
}, {
    limit?: number | undefined;
    status?: "ready" | "failed" | "live" | "ended" | "created" | undefined;
    page?: number | undefined;
    category?: string | undefined;
}>;
export type CreateLiveStreamInput = z.infer<typeof createLiveStreamSchema>;
export type UpdateLiveStreamInput = z.infer<typeof updateLiveStreamSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ValidateStreamKeyInput = z.infer<typeof validateStreamKeySchema>;
export type ListStreamsQueryInput = z.infer<typeof listStreamsQuerySchema>;
//# sourceMappingURL=live.d.ts.map