export declare class SubscriptionService {
    /**
     * Subscribe to a creator
     */
    subscribe(subscriberId: string, creatorId: string): Promise<{
        subscribed: boolean;
        isNew: boolean;
    }>;
    /**
     * Unsubscribe from a creator
     */
    unsubscribe(subscriberId: string, creatorId: string): Promise<{
        unsubscribed: boolean;
    }>;
    /**
     * Check subscription status
     */
    getSubscriptionStatus(subscriberId: string, creatorId: string): Promise<{
        subscribed: boolean;
        notificationsEnabled?: boolean;
    }>;
    /**
     * Toggle notifications for a subscription
     */
    toggleNotifications(subscriberId: string, creatorId: string, enabled: boolean): Promise<{
        notificationsEnabled: boolean;
    }>;
    /**
     * Get channels the user is following
     */
    getFollowing(subscriberId: string, page?: number, limit?: number): Promise<{
        channels: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get user's subscribers (for creators)
     */
    getSubscribers(creatorId: string, page?: number, limit?: number): Promise<{
        subscribers: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get subscriber count for a creator
     */
    getSubscriberCount(creatorId: string): Promise<number>;
}
//# sourceMappingURL=subscription.service.d.ts.map