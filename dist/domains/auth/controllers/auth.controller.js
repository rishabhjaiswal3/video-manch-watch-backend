"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_js_1 = require("../services/auth.service.js");
const authHelpers_js_1 = require("../../../shared/utils/authHelpers.js");
const cookies_js_1 = require("../../../shared/utils/cookies.js");
const authService = new auth_service_js_1.AuthService();
const ACCESS_COOKIE_NAME = 'videomanch_access_token';
const REFRESH_COOKIE_NAME = 'videomanch_refresh_token';
function parseDurationToMs(raw, fallbackMs) {
    if (!raw)
        return fallbackMs;
    const value = raw.trim();
    const match = value.match(/^(\d+)([smhd])$/i);
    if (!match)
        return fallbackMs;
    const amount = parseInt(match[1], 10);
    if (!Number.isFinite(amount) || amount <= 0)
        return fallbackMs;
    const unit = match[2].toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] || 1);
}
class AuthController {
    getCookieBaseOptions() {
        const isProd = process.env.NODE_ENV === 'production';
        const configuredSameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
        const sameSite = configuredSameSite === 'none'
            ? 'none'
            : configuredSameSite === 'strict'
                ? 'strict'
                : 'lax';
        const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
        const useCookieDomain = Boolean(configuredDomain && (isProd || configuredDomain.includes('localhost')));
        return {
            httpOnly: true,
            secure: isProd || sameSite === 'none',
            sameSite,
            path: '/',
            ...(useCookieDomain ? { domain: configuredDomain } : {}),
        };
    }
    setAuthCookies(res, auth) {
        const base = this.getCookieBaseOptions();
        const accessMaxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN, 2 * 24 * 60 * 60 * 1000);
        const refreshMaxAge = parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
        res.cookie(ACCESS_COOKIE_NAME, auth.accessToken, { ...base, maxAge: accessMaxAge });
        res.cookie(REFRESH_COOKIE_NAME, auth.refreshToken, { ...base, maxAge: refreshMaxAge });
    }
    clearAuthCookies(res) {
        const base = this.getCookieBaseOptions();
        res.clearCookie(ACCESS_COOKIE_NAME, base);
        res.clearCookie(REFRESH_COOKIE_NAME, base);
    }
    async handleRoleLoginFlow(role, req, res) {
        const { email, password, otp } = req.body;
        if (!password && !otp) {
            const result = await authService.startRoleLogin(role, email);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        if (password && !otp) {
            const result = await authService.loginWithRolePassword(role, email, password);
            this.setAuthCookies(res, result);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        if (password && otp) {
            const result = await authService.verifySignupOtpAndCreate(role, email, otp, password);
            this.setAuthCookies(res, result);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Invalid login request. Provide email only, email+password, or email+password+otp.',
        });
    }
    async signup(req, res) {
        try {
            const { email, password, otp } = req.body;
            if (!otp) {
                const result = await authService.startSignup('user', email);
                return res.status(200).json({
                    success: true,
                    data: result,
                    message: 'OTP sent to your email.',
                });
            }
            const result = await authService.verifySignupOtpAndCreate('user', email, otp, password);
            this.setAuthCookies(res, result);
            return res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            // MongoDB duplicate key error code
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'An account with this email already exists.',
                });
            }
            const message = error?.message || 'Failed to create account.';
            const status = message.includes('OTP')
                ? 401
                : message.includes('exists')
                    ? 409
                    : 500;
            if (status === 500) {
                console.error('[AUTH] Signup error:', error);
            }
            return res.status(status).json({
                success: false,
                error: message,
            });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            this.setAuthCookies(res, result);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            // Standardize auth errors to 401
            if (error.message.includes('Invalid')) {
                return res.status(401).json({
                    success: false,
                    error: error.message,
                });
            }
            console.error('[AUTH] Login error:', error);
            return res.status(500).json({
                success: false,
                error: 'Login failed.',
            });
        }
    }
    async loginUser(req, res) {
        try {
            return await this.handleRoleLoginFlow('user', req, res);
        }
        catch (error) {
            const message = error?.message || 'User login failed.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Invalid email or password')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            if (status === 500) {
                console.error('[AUTH] User OTP login error:', error);
            }
            return res.status(status).json({
                success: false,
                error: message,
            });
        }
    }
    async loginCreator(req, res) {
        try {
            return await this.handleRoleLoginFlow('creator', req, res);
        }
        catch (error) {
            const message = error?.message || 'Creator login failed.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Invalid email or password')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            if (status === 500) {
                console.error('[AUTH] Creator OTP login error:', error);
            }
            return res.status(status).json({
                success: false,
                error: message,
            });
        }
    }
    async requestUserPasswordReset(req, res) {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordResetOtp('user', email);
            return res.status(200).json({
                success: true,
                data: result,
                message: 'OTP sent to your email.',
            });
        }
        catch (error) {
            const message = error?.message || 'Failed to request password reset.';
            const status = message.includes('account found') ? 404 : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }
    async requestCreatorPasswordReset(req, res) {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordResetOtp('creator', email);
            return res.status(200).json({
                success: true,
                data: result,
                message: 'OTP sent to your email.',
            });
        }
        catch (error) {
            const message = error?.message || 'Failed to request password reset.';
            const status = message.includes('account found') ? 404 : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }
    async resetUserPassword(req, res) {
        try {
            const { email, otp, password, currentPassword } = req.body;
            const result = await authService.resetPasswordWithOtp('user', email, otp, password, currentPassword);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            const message = error?.message || 'Failed to reset password.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Current password is incorrect')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }
    async resetCreatorPassword(req, res) {
        try {
            const { email, otp, password, currentPassword } = req.body;
            const result = await authService.resetPasswordWithOtp('creator', email, otp, password, currentPassword);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            const message = error?.message || 'Failed to reset password.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Current password is incorrect')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }
    async refresh(req, res) {
        try {
            const refreshToken = req.body?.refreshToken || (0, cookies_js_1.getCookieValue)(req, REFRESH_COOKIE_NAME);
            if (!refreshToken) {
                this.clearAuthCookies(res);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired refresh token. Please log in again.',
                });
            }
            const result = await authService.refresh(refreshToken);
            this.setAuthCookies(res, {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                user: {
                    id: result.user.userId,
                    userId: result.user.userId,
                    email: result.user.email,
                    userType: result.user.userType,
                    roles: result.user.roles,
                },
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            this.clearAuthCookies(res);
            // Any token error -> 401
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token. Please log in again.',
            });
        }
    }
    async logout(req, res) {
        try {
            let userId = null;
            try {
                userId = (0, authHelpers_js_1.ensureAuthenticatedUser)(req).userId;
            }
            catch {
                const refreshToken = req.body?.refreshToken || (0, cookies_js_1.getCookieValue)(req, REFRESH_COOKIE_NAME);
                if (refreshToken) {
                    try {
                        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
                        const decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
                        userId = decoded?.userId || null;
                    }
                    catch {
                        userId = null;
                    }
                }
            }
            if (userId) {
                await authService.logout(userId);
            }
            this.clearAuthCookies(res);
            return res.status(200).json({
                success: true,
                data: { message: 'Logged out successfully.' },
            });
        }
        catch (error) {
            console.error('[AUTH] Logout error:', error);
            return res.status(500).json({
                success: false,
                error: 'Logout failed.',
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map