import { z } from 'zod';

const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_reveal']);

// Profile schemas
export const createProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform((val) => val.toLowerCase()),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim(),
  gender: genderSchema.optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
  links: z
    .array(
      z.object({
        label: z.string().max(30, 'Link label cannot exceed 30 characters'),
        url: z.string().url('Invalid URL format'),
      })
    )
    .max(5, 'Maximum 5 links allowed')
    .optional(),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim()
    .optional(),
  gender: genderSchema.optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
  links: z
    .array(
      z.object({
        label: z.string().max(30, 'Link label cannot exceed 30 characters'),
        url: z.string().url('Invalid URL format'),
      })
    )
    .max(5, 'Maximum 5 links allowed')
    .optional(),
});

// Avatar/Banner upload schema
export const uploadAssetSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z
    .string()
    .refine(
      (val) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(val),
      'Only JPEG, PNG, WebP, and GIF images are allowed'
    ),
  fileSize: z
    .number()
    .min(1, 'File size must be greater than 0')
    .max(20 * 1024 * 1024, 'File size cannot exceed 20MB'),
});


// Comment schemas
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters')
    .trim(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters')
    .trim(),
});

// Reel report schema
export const createReelReportSchema = z.object({
  videoId: z.string().min(1, 'videoId is required').trim(),
  reason: z.enum(
    ['violence', 'hate', 'sexual', 'misinformation', 'spam', 'copyright', 'other'],
    { errorMap: () => ({ message: 'Invalid report reason' }) }
  ),
  details: z
    .string()
    .max(2000, 'Details cannot exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  source: z.enum(['reels']).default('reels'),
  submittedAt: z.coerce.date().optional(),
});

// Subscription schemas
export const updateNotificationSchema = z.object({
  enabled: z.boolean(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UploadAssetInput = z.infer<typeof uploadAssetSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReelReportInput = z.infer<typeof createReelReportSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
