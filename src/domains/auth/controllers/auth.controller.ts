import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';

const authService = new AuthService();

export class AuthController {
    private async handleRoleLoginFlow(
        role: 'user' | 'creator',
        req: Request,
        res: Response
    ) {
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
            return res.status(200).json({
                success: true,
                data: result,
            });
        }

        if (password && otp) {
            const result = await authService.verifySignupOtpAndCreate(role, email, otp, password);
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


    async signup(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await authService.signup(email, password);

            return res.status(201).json({
                success: true,
                data: result,
            });

        } catch (error: any) {
            // MongoDB duplicate key error code
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'An account with this email already exists.',
                });
            }

            console.error('[AUTH] Signup error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create account.',
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);

            return res.status(200).json({
                success: true,
                data: result,
            });

        } catch (error: any) {
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

    async loginUser(req: Request, res: Response) {
        try {
            return await this.handleRoleLoginFlow('user', req, res);
        } catch (error: any) {
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

    async loginCreator(req: Request, res: Response) {
        try {
            return await this.handleRoleLoginFlow('creator', req, res);
        } catch (error: any) {
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

    async requestUserPasswordReset(req: Request, res: Response) {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordResetOtp('user', email);
            return res.status(200).json({
                success: true,
                data: result,
                message: 'OTP sent to your email.',
            });
        } catch (error: any) {
            const message = error?.message || 'Failed to request password reset.';
            const status = message.includes('account found') ? 404 : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }

    async requestCreatorPasswordReset(req: Request, res: Response) {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordResetOtp('creator', email);
            return res.status(200).json({
                success: true,
                data: result,
                message: 'OTP sent to your email.',
            });
        } catch (error: any) {
            const message = error?.message || 'Failed to request password reset.';
            const status = message.includes('account found') ? 404 : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }

    async resetUserPassword(req: Request, res: Response) {
        try {
            const { email, otp, password, currentPassword } = req.body;
            const result = await authService.resetPasswordWithOtp('user', email, otp, password, currentPassword);
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            const message = error?.message || 'Failed to reset password.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Current password is incorrect')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }

    async resetCreatorPassword(req: Request, res: Response) {
        try {
            const { email, otp, password, currentPassword } = req.body;
            const result = await authService.resetPasswordWithOtp('creator', email, otp, password, currentPassword);
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            const message = error?.message || 'Failed to reset password.';
            const status = message.includes('Invalid OTP') || message.includes('expired') || message.includes('Current password is incorrect')
                ? 401
                : message.includes('account found')
                    ? 404
                    : 500;
            return res.status(status).json({ success: false, error: message });
        }
    }

    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refresh(refreshToken);

            return res.status(200).json({
                success: true,
                data: result,
            });

        } catch (error: any) {
            // Any token error -> 401
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token. Please log in again.',
            });
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            await authService.logout(userId);

            return res.status(200).json({
                success: true,
                data: { message: 'Logged out successfully.' },
            });

        } catch (error) {
            console.error('[AUTH] Logout error:', error);
            return res.status(500).json({
                success: false,
                error: 'Logout failed.',
            });
        }
    }
}
