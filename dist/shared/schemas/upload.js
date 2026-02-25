"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeUploadSchema = exports.initUploadSchema = void 0;
const zod_1 = require("zod");
const ALLOWED_MIME_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
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
});
exports.completeUploadSchema = zod_1.z.object({
    videoId: zod_1.z.string().uuid('Invalid video ID format'),
});
//# sourceMappingURL=upload.js.map