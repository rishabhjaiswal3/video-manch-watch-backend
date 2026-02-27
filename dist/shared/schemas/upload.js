"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thumbnailUrlSchema = exports.updateVideoSchema = exports.initUploadBatchSchema = exports.completeUploadSchema = exports.initUploadSchema = void 0;
const zod_1 = require("zod");
const ALLOWED_MIME_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/mov',
    'video/x-quicktime',
    'video/x-msvideo',
    'video/avi',
    'video/x-matroska',
    'video/matroska',
    'video/mkv',
    'application/x-matroska',
    'video/webm',
];
const MAX_USER_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
exports.initUploadSchema = zod_1.z.object({
    videoId: zod_1.z.string().uuid('Invalid video ID format').optional(),
    filename: zod_1.z
        .string()
        .min(1, 'Filename is required')
        .max(255, 'Filename is too long'),
    fileSize: zod_1.z
        .number()
        .positive('File size must be positive')
        .max(MAX_USER_SIZE, 'File size exceeds maximum allowed (2GB)'),
    mimeType: zod_1.z
        .string()
        .refine((val) => ALLOWED_MIME_TYPES.includes(val), {
        message: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
    title: zod_1.z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title is too long')
        .transform((val) => val.trim()),
    description: zod_1.z
        .string()
        .max(5000, 'Description is too long')
        .optional()
        .transform((val) => val?.trim()),
    tags: zod_1.z
        .array(zod_1.z.string().min(1).max(50).transform((val) => val.trim()))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),
    contentType: zod_1.z.enum(['vod', 'reel', 'live']).optional(),
});
exports.completeUploadSchema = zod_1.z.object({
    videoId: zod_1.z.string().uuid('Invalid video ID format'),
});
exports.initUploadBatchSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string().min(8).max(128).optional(),
    items: zod_1.z.array(exports.initUploadSchema.extend({
        clientId: zod_1.z.string().min(1).max(100),
    })).min(1, 'At least one item is required').max(25, 'Maximum 25 items allowed per batch'),
});
exports.updateVideoSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).transform((v) => v.trim()).optional(),
    description: zod_1.z.string().max(5000).optional().transform((v) => v?.trim()),
    tags: zod_1.z.array(zod_1.z.string().min(1).max(50).transform((v) => v.trim())).max(10).optional(),
    contentType: zod_1.z.enum(['vod', 'reel', 'live']).optional(),
    thumbnail: zod_1.z.string().max(500).optional(),
    isDownloadable: zod_1.z.boolean().optional(),
    isAdultContent: zod_1.z.boolean().optional(),
    allowLikes: zod_1.z.boolean().optional(),
    allowDislikes: zod_1.z.boolean().optional(),
    allowComments: zod_1.z.boolean().optional(),
    visibility: zod_1.z.enum(['listed', 'unlisted']).optional(),
});
exports.thumbnailUrlSchema = zod_1.z.object({
    mimeType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp'], {
        errorMap: () => ({ message: 'Invalid image type. Allowed: JPEG, PNG, WebP' }),
    }),
});
//# sourceMappingURL=upload.js.map