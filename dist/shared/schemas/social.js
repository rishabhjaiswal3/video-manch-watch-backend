"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.updateNotificationSchema = exports.updateCommentSchema = exports.createCommentSchema = exports.uploadAssetSchema = exports.updateProfileSchema = exports.createProfileSchema = void 0;
const zod_1 = require("zod");
// Profile schemas
exports.createProfileSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .transform((val) => val.toLowerCase()),
    displayName: zod_1.z
        .string()
        .min(1, 'Display name is required')
        .max(50, 'Display name cannot exceed 50 characters')
        .trim(),
    bio: zod_1.z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
    location: zod_1.z.string().max(100, 'Location cannot exceed 100 characters').optional(),
    links: zod_1.z
        .array(zod_1.z.object({
        label: zod_1.z.string().max(30, 'Link label cannot exceed 30 characters'),
        url: zod_1.z.string().url('Invalid URL format'),
    }))
        .max(5, 'Maximum 5 links allowed')
        .optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z
        .string()
        .min(1, 'Display name is required')
        .max(50, 'Display name cannot exceed 50 characters')
        .trim()
        .optional(),
    bio: zod_1.z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
    location: zod_1.z.string().max(100, 'Location cannot exceed 100 characters').optional(),
    links: zod_1.z
        .array(zod_1.z.object({
        label: zod_1.z.string().max(30, 'Link label cannot exceed 30 characters'),
        url: zod_1.z.string().url('Invalid URL format'),
    }))
        .max(5, 'Maximum 5 links allowed')
        .optional(),
});
// Avatar/Banner upload schema
exports.uploadAssetSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1, 'Filename is required'),
    mimeType: zod_1.z
        .string()
        .refine((val) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(val), 'Only JPEG, PNG, WebP, and GIF images are allowed'),
    fileSize: zod_1.z
        .number()
        .min(1, 'File size must be greater than 0')
        .max(20 * 1024 * 1024, 'File size cannot exceed 20MB'),
});
// Comment schemas
exports.createCommentSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, 'Comment cannot be empty')
        .max(2000, 'Comment cannot exceed 2000 characters')
        .trim(),
});
exports.updateCommentSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, 'Comment cannot be empty')
        .max(2000, 'Comment cannot exceed 2000 characters')
        .trim(),
});
// Subscription schemas
exports.updateNotificationSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
});
// Pagination schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=social.js.map