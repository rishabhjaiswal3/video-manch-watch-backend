"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const Subscription_js_1 = require("../../../models/Subscription.js");
const Profile_js_1 = require("../../../models/Profile.js");
const User_js_1 = require("../../../models/User.js");
class SubscriptionService {
    /**
     * Subscribe to a creator
     */
    async subscribe(subscriberId, creatorId) {
        // Can't subscribe to yourself
        if (subscriberId === creatorId) {
            throw new Error('Cannot subscribe to yourself');
        }
        // Check if creator exists and has a profile
        const [creatorUser, creatorProfile] = await Promise.all([
            User_js_1.User.findById(creatorId),
            Profile_js_1.Profile.findOne({ userId: creatorId }),
        ]);
        if (!creatorUser) {
            throw new Error('Creator not found');
        }
        // Check if already subscribed
        const existing = await Subscription_js_1.Subscription.findOne({ subscriberId, creatorId });
        if (existing) {
            return { subscribed: true, isNew: false };
        }
        // Create subscription
        await Subscription_js_1.Subscription.create({ subscriberId, creatorId });
        // Increment creator's subscriber count
        if (creatorProfile) {
            await Profile_js_1.Profile.updateOne({ userId: creatorId }, { $inc: { subscriberCount: 1 } });
        }
        return { subscribed: true, isNew: true };
    }
    /**
     * Unsubscribe from a creator
     */
    async unsubscribe(subscriberId, creatorId) {
        const deleted = await Subscription_js_1.Subscription.findOneAndDelete({ subscriberId, creatorId });
        if (!deleted) {
            return { unsubscribed: false };
        }
        // Decrement creator's subscriber count
        await Profile_js_1.Profile.updateOne({ userId: creatorId }, { $inc: { subscriberCount: -1 } });
        return { unsubscribed: true };
    }
    /**
     * Check subscription status
     */
    async getSubscriptionStatus(subscriberId, creatorId) {
        const subscription = await Subscription_js_1.Subscription.findOne({ subscriberId, creatorId });
        if (!subscription) {
            return { subscribed: false };
        }
        return {
            subscribed: true,
            notificationsEnabled: subscription.notificationsEnabled,
        };
    }
    /**
     * Toggle notifications for a subscription
     */
    async toggleNotifications(subscriberId, creatorId, enabled) {
        const subscription = await Subscription_js_1.Subscription.findOneAndUpdate({ subscriberId, creatorId }, { notificationsEnabled: enabled }, { new: true });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        return { notificationsEnabled: subscription.notificationsEnabled };
    }
    /**
     * Get channels the user is following
     */
    async getFollowing(subscriberId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [subscriptions, total] = await Promise.all([
            Subscription_js_1.Subscription.find({ subscriberId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Subscription_js_1.Subscription.countDocuments({ subscriberId }),
        ]);
        // Get profiles for subscribed creators
        const creatorIds = subscriptions.map((s) => s.creatorId);
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: creatorIds } })
            .select('userId username displayName avatar isVerified subscriberCount')
            .lean();
        // Create map and preserve order
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        const channels = subscriptions.map((s) => ({
            ...profileMap.get(s.creatorId),
            notificationsEnabled: s.notificationsEnabled,
            subscribedAt: s.createdAt,
        })).filter((c) => c.userId);
        return {
            channels,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get user's subscribers (for creators)
     */
    async getSubscribers(creatorId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [subscriptions, total] = await Promise.all([
            Subscription_js_1.Subscription.find({ creatorId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Subscription_js_1.Subscription.countDocuments({ creatorId }),
        ]);
        // Get profiles for subscribers
        const subscriberIds = subscriptions.map((s) => s.subscriberId);
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: subscriberIds } })
            .select('userId username displayName avatar')
            .lean();
        // Create map and preserve order
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        const subscribers = subscriptions.map((s) => ({
            ...profileMap.get(s.subscriberId),
            subscribedAt: s.createdAt,
        })).filter((sub) => sub.userId);
        return {
            subscribers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get subscriber count for a creator
     */
    async getSubscriberCount(creatorId) {
        return Subscription_js_1.Subscription.countDocuments({ creatorId });
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=subscription.service.js.map