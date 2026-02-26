import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
];

const MAX_USER_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export const initUploadSchema = z.object({
  videoId: z.string().uuid('Invalid video ID format').optional(),
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename is too long'),
  fileSize: z
    .number()
    .positive('File size must be positive')
    .max(MAX_USER_SIZE, 'File size exceeds maximum allowed (2GB)'),
  mimeType: z
    .string()
    .refine((val) => ALLOWED_MIME_TYPES.includes(val), {
      message: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional()
    .transform((val) => val?.trim()),
  tags: z
    .array(
      z.string().min(1).max(50).transform((val) => val.trim())
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  contentType: z.enum(['vod', 'reel', 'live']).optional(),
});

export const completeUploadSchema = z.object({
  videoId: z.string().uuid('Invalid video ID format'),
});

export const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).transform((v) => v.trim()).optional(),
  description: z.string().max(5000).optional().transform((v) => v?.trim()),
  tags: z.array(z.string().min(1).max(50).transform((v) => v.trim())).max(10).optional(),
  contentType: z.enum(['vod', 'reel', 'live']).optional(),
  thumbnail: z.string().max(500).optional(),
  isDownloadable: z.boolean().optional(),
  isAdultContent: z.boolean().optional(),
  allowLikes: z.boolean().optional(),
  allowDislikes: z.boolean().optional(),
  allowComments: z.boolean().optional(),
});

export const thumbnailUrlSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Invalid image type. Allowed: JPEG, PNG, WebP' }),
  }),
});

export type InitUploadInput = z.infer<typeof initUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type ThumbnailUrlInput = z.infer<typeof thumbnailUrlSchema>;
