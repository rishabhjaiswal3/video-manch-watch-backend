import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { ensureAuthenticatedUser } from '../utils/authHelpers.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Get paginated list of all users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;
    const userType = req.query.userType as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    if (userType && ['user', 'creator', 'admin'].includes(userType)) {
      query.userType = userType;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id.toString(),
          email: u.email,
          userType: u.userType,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get single user details
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role
 */
router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;
    const currentUser = ensureAuthenticatedUser(req);

    // Validate userType
    if (!userType || !['user', 'creator', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userType. Must be user, creator, or admin.',
      });
    }

    // Prevent admin from demoting themselves
    if (userId === currentUser.userId && userType !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own admin role.',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { userType } },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    console.log(`[ADMIN] User role updated: ${user.email} -> ${userType}`);

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error updating user role:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user role',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [userCounts, recentUsers] = await Promise.all([
      User.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
      User.find()
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const stats = {
      totalUsers: 0,
      byType: {
        user: 0,
        creator: 0,
        admin: 0,
      } as Record<string, number>,
    };

    userCounts.forEach((item: { _id: string; count: number }) => {
      if (item._id in stats.byType) {
        stats.byType[item._id] = item.count;
      }
      stats.totalUsers += item.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        stats,
        recentUsers: recentUsers.map((u) => ({
          id: u._id.toString(),
          email: u.email,
          userType: u.userType,
          createdAt: u.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
});

export default router;
