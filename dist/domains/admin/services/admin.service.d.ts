export interface GetUsersParams {
    page: number;
    limit: number;
    search?: string;
    userType?: string;
}
export declare class AdminService {
    /**
     * Get paginated list of all users
     */
    getUsers(params: GetUsersParams): Promise<{
        users: {
            id: string;
            email: string;
            userType: "user" | "creator" | "admin";
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get single user details
     */
    getUserById(userId: string): Promise<{
        id: string;
        email: string;
        userType: "user" | "creator" | "admin";
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    /**
     * Update user role
     */
    updateUserRole(targetUserId: string, newRole: string, currentUserId: string): Promise<{
        id: string;
        email: string;
        userType: "user" | "creator" | "admin";
        updatedAt: Date;
    } | null>;
    /**
     * Get platform statistics
     */
    getStats(): Promise<{
        stats: {
            totalUsers: number;
            byType: Record<string, number>;
        };
        transcoding: {
            videos: {
                totalVideos: number;
                byStatus: Record<string, number>;
            };
            queues: {
                user: {
                    waiting: number;
                    active: number;
                    completed: number;
                    failed: number;
                };
                creator: {
                    waiting: number;
                    active: number;
                    completed: number;
                    failed: number;
                };
            };
            performance: {
                avgDownloadMs: number;
                avgTranscodeMs: number;
                avgUploadMs: number;
                avgTotalMs: number;
            };
            storage: {
                totalOriginalSize: number;
                totalTranscodedSize: number;
            };
            successRate: number;
            activeViewers: number;
        };
        playback: {
            totalViews: number;
            totalWatchTime: number;
        };
        recentUsers: {
            id: string;
            email: string;
            userType: "user" | "creator" | "admin";
            createdAt: Date;
        }[];
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map