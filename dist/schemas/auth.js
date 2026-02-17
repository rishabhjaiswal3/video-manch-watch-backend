"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.refreshTokenSchema = exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email format')
        .min(5, 'Email is too short')
        .max(255, 'Email is too long')
        .transform((val) => val.toLowerCase().trim()),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email format')
        .transform((val) => val.toLowerCase().trim()),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().optional(),
});
//# sourceMappingURL=auth.js.map