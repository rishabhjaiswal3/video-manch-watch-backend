import { User } from '../../../shared/models/User.js';

export interface GetUsersParams {
    page: number;
    limit: number;
    search?: string;
    userType?: string;
}

export class AdminService {
    /**
     * Get paginated list of all users
     */
    async getUsers(params: GetUsersParams) {
        const skip = (params.page - 1) * params.limit;

        // Build query
        const query: Record<string, unknown> = {};

        if (params.search) {
            query.email = { $regex: params.search, $options: 'i' };
        }

        if (params.userType && ['user', 'creator', 'admin'].includes(params.userType)) {
            query.userType = params.userType;
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -refreshToken')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            User.countDocuments(query),
        ]);

        return {
            users: users.map((u) => ({
                id: u._id.toString(),
                email: u.email,
                userType: u.userType,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            })),
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }

    /**
     * Get single user details
     */
    async getUserById(userId: string) {
        const user = await User.findById(userId)
            .select('-password -refreshToken')
            .lean();

        if (!user) return null;

        return {
            id: user._id.toString(),
            email: user.email,
            userType: user.userType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    /**
     * Update user role
     */
    async updateUserRole(targetUserId: string, newRole: string, currentUserId: string) {
        // Validate userType
        if (!['user', 'creator', 'admin'].includes(newRole)) {
            throw new Error('Invalid userType. Must be user, creator, or admin.');
        }

        // Prevent admin from demoting themselves
        if (targetUserId === currentUserId && newRole !== 'admin') {
            throw new Error('Cannot change your own admin role.');
        }

        const user = await User.findByIdAndUpdate(
            targetUserId,
            { $set: { userType: newRole } },
            { new: true }
        ).select('-password -refreshToken');

        if (!user) return null;

        return {
            id: user._id.toString(),
            email: user.email,
            userType: user.userType,
            updatedAt: user.updatedAt,
        };
    }

    /**
     * Get platform statistics
     */
    async getStats() {
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

        return {
            stats,
            recentUsers: recentUsers.map((u) => ({
                id: u._id.toString(),
                email: u.email,
                userType: u.userType,
                createdAt: u.createdAt,
            })),
        };
    }
}
