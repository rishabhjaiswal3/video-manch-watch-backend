import { Subscription } from '../app/social/model/Subscription.js';
import { Profile } from '../app/user/model/Profile.js';

const normalizePagination = (page, limit) => {
  const p = Math.max(1, parseInt(page || '1', 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit || '20', 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};

export async function subscribe(subscriberId, creatorId) {
  if (!subscriberId) throw new Error('Authentication required');
  if (!creatorId)    throw new Error('creatorId is required');
  if (subscriberId === creatorId) throw new Error('Cannot subscribe to yourself');

  const existing = await Subscription.findOne({ subscriberId, creatorId });
  if (existing) return { subscribed: true, isNew: false };

  await Subscription.create({ subscriberId, creatorId });
  await Profile.updateOne({ userId: creatorId }, { $inc: { subscriberCount: 1 } });

  const profile = await Profile.findOne({ userId: creatorId }, { subscriberCount: 1 }).lean();
  return { subscribed: true, isNew: true, subscriberCount: profile?.subscriberCount ?? 0 };
}

export async function unsubscribe(subscriberId, creatorId) {
  if (!subscriberId) throw new Error('Authentication required');
  if (!creatorId)    throw new Error('creatorId is required');

  const result = await Subscription.deleteOne({ subscriberId, creatorId });
  if (result.deletedCount > 0) {
    await Profile.updateOne({ userId: creatorId }, { $inc: { subscriberCount: -1 } });
  }

  const profile = await Profile.findOne({ userId: creatorId }, { subscriberCount: 1 }).lean();
  return { subscribed: false, subscriberCount: Math.max(0, profile?.subscriberCount ?? 0) };
}

export async function getSubscriptionStatus(subscriberId, creatorId) {
  if (!subscriberId) throw new Error('Authentication required');
  if (!creatorId)    throw new Error('creatorId is required');

  const [sub, profile] = await Promise.all([
    Subscription.findOne({ subscriberId, creatorId }, { notificationsEnabled: 1 }).lean(),
    Profile.findOne({ userId: creatorId }, { subscriberCount: 1 }).lean(),
  ]);

  return {
    subscribed: !!sub,
    notificationsEnabled: sub?.notificationsEnabled ?? false,
    subscriberCount: Math.max(0, profile?.subscriberCount ?? 0),
  };
}

export async function toggleNotifications(subscriberId, creatorId, enabled) {
  if (!subscriberId) throw new Error('Authentication required');
  if (!creatorId)    throw new Error('creatorId is required');

  await Subscription.updateOne(
    { subscriberId, creatorId },
    { $set: { notificationsEnabled: !!enabled } }
  );
  return { notificationsEnabled: !!enabled };
}

export async function getFollowing(userId, page, limit) {
  if (!userId) throw new Error('Authentication required');
  const { page: p, limit: l, skip } = normalizePagination(page, limit);

  const [subs, total] = await Promise.all([
    Subscription.find({ subscriberId: userId }).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    Subscription.countDocuments({ subscriberId: userId }),
  ]);

  const creatorIds = subs.map((s) => s.creatorId);
  const profiles = await Profile.find(
    { userId: { $in: creatorIds } },
    { userId: 1, username: 1, displayName: 1, avatar: 1, isVerified: 1, subscriberCount: 1 }
  ).lean();

  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  const channels = subs.map((s) => ({
    userId:               s.creatorId,
    notificationsEnabled: s.notificationsEnabled,
    subscribedAt:         s.createdAt,
    ...(profileMap[s.creatorId] || {}),
  }));

  return {
    channels,
    pagination: { page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) },
  };
}

export async function getSubscribers(creatorId, page, limit) {
  if (!creatorId) throw new Error('creatorId is required');
  const { page: p, limit: l, skip } = normalizePagination(page, limit);

  const [subs, total] = await Promise.all([
    Subscription.find({ creatorId }).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    Subscription.countDocuments({ creatorId }),
  ]);

  const subscriberIds = subs.map((s) => s.subscriberId);
  const profiles = await Profile.find(
    { userId: { $in: subscriberIds } },
    { userId: 1, username: 1, displayName: 1, avatar: 1 }
  ).lean();

  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  const subscribers = subs.map((s) => ({
    userId:       s.subscriberId,
    subscribedAt: s.createdAt,
    ...(profileMap[s.subscriberId] || {}),
  }));

  return {
    subscribers,
    pagination: { page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) },
  };
}
