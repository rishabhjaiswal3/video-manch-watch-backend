import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ensureAuthenticatedUser } from '../../../shared/utils/authHelpers.js';

const adminService = new AdminService();

export class AdminController {
    /**
     * GET /api/admin/users
     */
    async getUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const search = req.query.search as string;
            const userType = req.query.userType as string;

            const result = await adminService.getUsers({ page, limit, search, userType });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('[ADMIN] Error fetching users:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch users',
            });
        }
    }

    /**
     * GET /api/admin/users/:userId
     */
    async getUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const user = await adminService.getUserById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            return res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            console.error('[ADMIN] Error fetching user:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch user',
            });
        }
    }

    /**
     * PATCH /api/admin/users/:userId/role
     */
    async updateUserRole(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const { userType } = req.body;
            const currentUser = ensureAuthenticatedUser(req);

            if (!userType) {
                return res.status(400).json({
                    success: false,
                    error: 'userType is required',
                });
            }

            try {
                const updatedUser = await adminService.updateUserRole(userId, userType, currentUser.userId);

                if (!updatedUser) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found',
                    });
                }

                console.log(`[ADMIN] User role updated: ${updatedUser.email} -> ${userType}`);

                return res.status(200).json({
                    success: true,
                    data: updatedUser,
                });
            } catch (err: any) {
                return res.status(400).json({
                    success: false,
                    error: err.message,
                });
            }
        } catch (error) {
            console.error('[ADMIN] Error updating user role:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update user role',
            });
        }
    }

    /**
     * GET /api/admin/stats
     */
    async getStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getStats();

            return res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error('[ADMIN] Error fetching stats:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch stats',
            });
        }
    }
}
