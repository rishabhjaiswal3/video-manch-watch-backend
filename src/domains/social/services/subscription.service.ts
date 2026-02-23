import { Subscription } from '../../../shared/models/Subscription.js';
import { Profile } from '../../../shared/models/Profile.js';
import { User } from '../../../shared/models/User.js';

export class SubscriptionService {
  /**
   * Subscribe to a creator
   */
  async subscribe(
    subscriberId: string,
    creatorId: string
  ): Promise<{ subscribed: boolean; isNew: boolean }> {
    // Can't subscribe to yourself
    if (subscriberId === creatorId) {
      throw new Error('Cannot subscribe to yourself');
    }

    // Check if creator exists and has a profile
    const [creatorUser, creatorProfile] = await Promise.all([
      User.findById(creatorId),
      Profile.findOne({ userId: creatorId }),
    ]);

    if (!creatorUser) {
      throw new Error('Creator not found');
    }

    // Check if already subscribed
    const existing = await Subscription.findOne({ subscriberId, creatorId });
    if (existing) {
      return { subscribed: true, isNew: false };
    }

    // Create subscription
    await Subscription.create({ subscriberId, creatorId });

    // Increment creator's subscriber count
    if (creatorProfile) {
      await Profile.updateOne(
        { userId: creatorId },
        { $inc: { subscriberCount: 1 } }
      );
    }

    return { subscribed: true, isNew: true };
  }

  /**
   * Unsubscribe from a creator
   */
  async unsubscribe(subscriberId: string, creatorId: string): Promise<{ unsubscribed: boolean }> {
    const deleted = await Subscription.findOneAndDelete({ subscriberId, creatorId });

    if (!deleted) {
      return { unsubscribed: false };
    }

    // Decrement creator's subscriber count
    await Profile.updateOne(
      { userId: creatorId },
      { $inc: { subscriberCount: -1 } }
    );

    return { unsubscribed: true };
  }

  /**
   * Check subscription status
   */
  async getSubscriptionStatus(
    subscriberId: string,
    creatorId: string
  ): Promise<{ subscribed: boolean; notificationsEnabled?: boolean }> {
    const subscription = await Subscription.findOne({ subscriberId, creatorId });

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
  async toggleNotifications(
    subscriberId: string,
    creatorId: string,
    enabled: boolean
  ): Promise<{ notificationsEnabled: boolean }> {
    const subscription = await Subscription.findOneAndUpdate(
      { subscriberId, creatorId },
      { notificationsEnabled: enabled },
      { new: true }
    );

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return { notificationsEnabled: subscription.notificationsEnabled };
  }

  /**
   * Get channels the user is following
   */
  async getFollowing(
    subscriberId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    channels: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      Subscription.find({ subscriberId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments({ subscriberId }),
    ]);

    // Get profiles for subscribed creators
    const creatorIds = subscriptions.map((s) => s.creatorId);
    const profiles = await Profile.find({ userId: { $in: creatorIds } })
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
  async getSubscribers(
    creatorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    subscribers: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      Subscription.find({ creatorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments({ creatorId }),
    ]);

    // Get profiles for subscribers
    const subscriberIds = subscriptions.map((s) => s.subscriberId);
    const profiles = await Profile.find({ userId: { $in: subscriberIds } })
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
  async getSubscriberCount(creatorId: string): Promise<number> {
    return Subscription.countDocuments({ creatorId });
  }
}
