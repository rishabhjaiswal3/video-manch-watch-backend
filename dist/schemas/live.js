"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStreamsQuerySchema = exports.streamIdParamSchema = exports.validateStreamKeySchema = exports.sendChatMessageSchema = exports.updateLiveStreamSchema = exports.createLiveStreamSchema = void 0;
const zod_1 = require("zod");
// Create live stream schema
exports.createLiveStreamSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title cannot exceed 200 characters')
        .trim(),
    description: zod_1.z
        .string()
        .max(5000, 'Description cannot exceed 5000 characters')
        .trim()
        .optional(),
    category: zod_1.z
        .string()
        .max(50, 'Category cannot exceed 50 characters')
        .trim()
        .optional(),
    tags: zod_1.z
        .array(zod_1.z.string().max(50, 'Tag cannot exceed 50 characters').trim())
        .max(10, 'Maximum 10 tags allowed')
        .optional(),
    recordingEnabled: zod_1.z.boolean().default(true),
    chatEnabled: zod_1.z.boolean().default(true),
    isAdultContent: zod_1.z.boolean().default(false),
    scheduledAt: zod_1.z
        .string()
        .datetime()
        .optional()
        .transform((val) => (val ? new Date(val) : undefined)),
});
// Update live stream schema
exports.updateLiveStreamSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title cannot exceed 200 characters')
        .trim()
        .optional(),
    description: zod_1.z
        .string()
        .max(5000, 'Description cannot exceed 5000 characters')
        .trim()
        .optional(),
    category: zod_1.z
        .string()
        .max(50, 'Category cannot exceed 50 characters')
        .trim()
        .optional(),
    tags: zod_1.z
        .array(zod_1.z.string().max(50, 'Tag cannot exceed 50 characters').trim())
        .max(10, 'Maximum 10 tags allowed')
        .optional(),
    chatEnabled: zod_1.z.boolean().optional(),
    isAdultContent: zod_1.z.boolean().optional(),
});
// Send chat message schema
exports.sendChatMessageSchema = zod_1.z.object({
    message: zod_1.z
        .string()
        .min(1, 'Message cannot be empty')
        .max(500, 'Message cannot exceed 500 characters')
        .trim(),
});
// Validate stream key schema (for RTMP ingest)
exports.validateStreamKeySchema = zod_1.z.object({
    streamKey: zod_1.z.string().min(1, 'Stream key is required'),
    app: zod_1.z.string().optional(),
    tcUrl: zod_1.z.string().optional(),
});
// Stream ID param schema
exports.streamIdParamSchema = zod_1.z.object({
    streamId: zod_1.z.string().uuid('Invalid stream ID'),
});
// List streams query schema
exports.listStreamsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    category: zod_1.z.string().max(50).optional(),
    status: zod_1.z.enum(['created', 'ready', 'live', 'ended', 'failed']).optional(),
});
//# sourceMappingURL=live.js.map