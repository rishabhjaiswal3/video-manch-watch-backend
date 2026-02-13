import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';

const authService = new AuthService();

export class AuthController {

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
