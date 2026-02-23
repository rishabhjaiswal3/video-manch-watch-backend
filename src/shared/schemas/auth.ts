import { z } from 'zod';

export const signupSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email is too short')
    .max(255, 'Email is too long')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const otpLoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  otp: z.string().trim().length(6, 'OTP must be 6 digits').optional(),
});

export const roleLoginFlowSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  otp: z.string().trim().length(6, 'OTP must be 6 digits').optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
});

export const passwordResetConfirmSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  otp: z.string().trim().length(6, 'OTP must be 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpLoginInput = z.infer<typeof otpLoginSchema>;
export type RoleLoginFlowInput = z.infer<typeof roleLoginFlowSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
