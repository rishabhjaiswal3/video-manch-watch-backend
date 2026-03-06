"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const User_js_1 = require("../../../shared/models/User.js");
const Video_js_1 = require("../../../shared/models/Video.js");
const VideoAnalytics_js_1 = require("../../../shared/models/VideoAnalytics.js");
const queueService_js_1 = require("../../../infra/queue/queueService.js");
class AdminService {
    /**
     * Get paginated list of all users
     */
    async getUsers(params) {
        const skip = (params.page - 1) * params.limit;
        // Build query
        const query = {};
        if (params.search) {
            const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.email = { $regex: safeSearch, $options: 'i' };
        }
        if (params.userType && ['user', 'creator', 'admin'].includes(params.userType)) {
            query.userType = params.userType;
        }
        const [users, total] = await Promise.all([
            User_js_1.User.find(query)
                .select('-password -refreshToken')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            User_js_1.User.countDocuments(query),
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
    async getUserById(userId) {
        const user = await User_js_1.User.findById(userId)
            .select('-password -refreshToken')
            .lean();
        if (!user)
            return null;
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
    async updateUserRole(targetUserId, newRole, currentUserId) {
        // Validate userType
        if (!['user', 'creator', 'admin'].includes(newRole)) {
            throw new Error('Invalid userType. Must be user, creator, or admin.');
        }
        // Prevent admin from demoting themselves
        if (targetUserId === currentUserId && newRole !== 'admin') {
            throw new Error('Cannot change your own admin role.');
        }
        const user = await User_js_1.User.findByIdAndUpdate(targetUserId, { $set: { userType: newRole } }, { new: true }).select('-password -refreshToken');
        if (!user)
            return null;
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
        const safeQueueStats = async (userType) => {
            try {
                return await queueService_js_1.queueService.getQueueStats(userType);
            }
            catch (error) {
                console.warn(`[ADMIN] Queue stats unavailable for ${userType}: ${error?.message || 'unknown error'}`);
                return { waiting: 0, active: 0, completed: 0, failed: 0 };
            }
        };
        const [userCounts, recentUsers, videoStatusCounts, transcodingPerformance, storageStats, activeViewers, playbackTotals, userQueueStats, creatorQueueStats,] = await Promise.all([
            User_js_1.User.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
            User_js_1.User.find()
                .select('-password -refreshToken')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Video_js_1.Video.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Video_js_1.Video.aggregate([
                {
                    $match: {
                        status: 'completed',
                        'kpis.timings.total': { $exists: true },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgDownloadMs: { $avg: { $ifNull: ['$kpis.timings.download', 0] } },
                        avgTranscodeMs: { $avg: { $ifNull: ['$kpis.timings.transcode', 0] } },
                        avgUploadMs: { $avg: { $ifNull: ['$kpis.timings.upload', 0] } },
                        avgTotalMs: { $avg: { $ifNull: ['$kpis.timings.total', 0] } },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                {
                    $group: {
                        _id: null,
                        totalOriginalSize: { $sum: { $ifNull: ['$originalFile.size', 0] } },
                        totalTranscodedSize: { $sum: { $ifNull: ['$kpis.sizes.total', 0] } },
                    },
                },
            ]),
            VideoAnalytics_js_1.ActiveSession.countDocuments(),
            VideoAnalytics_js_1.VideoAnalytics.aggregate([
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: '$views' },
                        totalWatchTime: { $sum: '$totalWatchTime' },
                    },
                },
            ]),
            safeQueueStats('user'),
            safeQueueStats('creator'),
        ]);
        const stats = {
            totalUsers: 0,
            byType: {
                user: 0,
                creator: 0,
                admin: 0,
            },
        };
        userCounts.forEach((item) => {
            if (item._id in stats.byType) {
                stats.byType[item._id] = item.count;
            }
            stats.totalUsers += item.count;
        });
        const videoStats = {
            totalVideos: 0,
            byStatus: {
                pending: 0,
                uploading: 0,
                queued: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                deleted: 0,
            },
        };
        videoStatusCounts.forEach((item) => {
            if (item._id in videoStats.byStatus) {
                videoStats.byStatus[item._id] = item.count;
            }
            videoStats.totalVideos += item.count;
        });
        const perf = transcodingPerformance[0] || {
            avgDownloadMs: 0,
            avgTranscodeMs: 0,
            avgUploadMs: 0,
            avgTotalMs: 0,
        };
        const storage = storageStats[0] || {
            totalOriginalSize: 0,
            totalTranscodedSize: 0,
        };
        const playback = playbackTotals[0] || {
            totalViews: 0,
            totalWatchTime: 0,
        };
        const completed = videoStats.byStatus.completed || 0;
        const failed = videoStats.byStatus.failed || 0;
        const finished = completed + failed;
        const successRate = finished > 0 ? Number(((completed / finished) * 100).toFixed(1)) : 100;
        return {
            stats,
            transcoding: {
                videos: videoStats,
                queues: {
                    user: userQueueStats,
                    creator: creatorQueueStats,
                },
                performance: {
                    avgDownloadMs: Math.round(perf.avgDownloadMs || 0),
                    avgTranscodeMs: Math.round(perf.avgTranscodeMs || 0),
                    avgUploadMs: Math.round(perf.avgUploadMs || 0),
                    avgTotalMs: Math.round(perf.avgTotalMs || 0),
                },
                storage: {
                    totalOriginalSize: Math.round(storage.totalOriginalSize || 0),
                    totalTranscodedSize: Math.round(storage.totalTranscodedSize || 0),
                },
                successRate,
                activeViewers,
            },
            playback: {
                totalViews: Math.round(playback.totalViews || 0),
                totalWatchTime: Math.round(playback.totalWatchTime || 0),
            },
            recentUsers: recentUsers.map((u) => ({
                id: u._id.toString(),
                email: u.email,
                userType: u.userType,
                createdAt: u.createdAt,
            })),
        };
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map