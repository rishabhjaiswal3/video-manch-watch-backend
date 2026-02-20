import { z } from 'zod';

// Create live stream schema
export const createLiveStreamSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim()
    .optional(),
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  tags: z
    .array(z.string().max(50, 'Tag cannot exceed 50 characters').trim())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  recordingEnabled: z.boolean().default(true),
  chatEnabled: z.boolean().default(true),
  isAdultContent: z.boolean().default(false),
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

// Update live stream schema
export const updateLiveStreamSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim()
    .optional(),
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  tags: z
    .array(z.string().max(50, 'Tag cannot exceed 50 characters').trim())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  chatEnabled: z.boolean().optional(),
  isAdultContent: z.boolean().optional(),
});

// Send chat message schema
export const sendChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters')
    .trim(),
});

// Validate stream key schema (for RTMP ingest)
export const validateStreamKeySchema = z.object({
  streamKey: z.string().min(1, 'Stream key is required'),
  app: z.string().optional(),
  tcUrl: z.string().optional(),
});

// Stream ID param schema
export const streamIdParamSchema = z.object({
  streamId: z.string().uuid('Invalid stream ID'),
});

// List streams query schema
export const listStreamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().max(50).optional(),
  status: z.enum(['created', 'ready', 'live', 'ended', 'failed']).optional(),
});

// Types
export type CreateLiveStreamInput = z.infer<typeof createLiveStreamSchema>;
export type UpdateLiveStreamInput = z.infer<typeof updateLiveStreamSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ValidateStreamKeyInput = z.infer<typeof validateStreamKeySchema>;
export type ListStreamsQueryInput = z.infer<typeof listStreamsQuerySchema>;
