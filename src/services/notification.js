import { Notification } from '../app/social/model/Notification.js';
import { NotificationReceipt } from '../app/social/model/NotificationReceipt.js';
import { PushDeviceToken } from '../app/social/model/PushDeviceToken.js';

const normalizePagination = (page, limit) => {
  const p = Math.max(1, parseInt(page || '1', 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit || '20', 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};

export async function registerDeviceToken(userId, payload) {
  if (!userId) throw new Error('Authentication required');
  const token = (payload?.fcmToken || '').trim();
  const platform = payload?.platform;
  if (!token || !platform) throw new Error('fcmToken and platform are required');

  await PushDeviceToken.findOneAndUpdate(
    { fcmToken: token },
    {
      $set: {
        userId,
        platform,
        appVersion: payload?.appVersion,
        deviceMeta: payload?.deviceMeta,
        isActive: true,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  return { registered: true };
}

export async function unregisterDeviceToken(userId, fcmToken) {
  if (!userId) throw new Error('Authentication required');
  if (!fcmToken) throw new Error('fcmToken is required');

  await PushDeviceToken.updateOne(
    { userId, fcmToken },
    { $set: { isActive: false } }
  );
  return { removed: true };
}

export async function getMyNotifications(userId, page, limit) {
  if (!userId) throw new Error('Authentication required');
  const { page: p, limit: l, skip } = normalizePagination(page, limit);

  const [receipts, total, unreadCount] = await Promise.all([
    NotificationReceipt.find({ userId, channel: 'in_app' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    NotificationReceipt.countDocuments({ userId, channel: 'in_app' }),
    NotificationReceipt.countDocuments({ userId, channel: 'in_app', isRead: false }),
  ]);

  const ids = receipts.map((r) => r.notificationId);
  const notifications = await Notification.find({ notificationId: { $in: ids } }).lean();
  const byId = Object.fromEntries(notifications.map((n) => [n.notificationId, n]));

  const items = receipts.map((receipt) => {
    const notification = byId[receipt.notificationId];
    return {
      notificationId: receipt.notificationId,
      title: notification?.title || 'Notification',
      body: notification?.body || '',
      type: notification?.type || 'admin_broadcast',
      data: notification?.data || {},
      isRead: receipt.isRead,
      readAt: receipt.readAt || null,
      createdAt: receipt.createdAt,
    };
  });

  return {
    notifications: items,
    unreadCount,
    pagination: { page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) },
  };
}

export async function markNotificationAsRead(userId, notificationId) {
  if (!userId) throw new Error('Authentication required');
  if (!notificationId) throw new Error('notificationId is required');

  const updated = await NotificationReceipt.findOneAndUpdate(
    { userId, notificationId, channel: 'in_app' },
    { $set: { isRead: true, status: 'read', readAt: new Date() } },
    { new: true }
  ).lean();

  if (!updated) throw new Error('Notification not found');
  return { read: true };
}

export async function markAllNotificationsAsRead(userId) {
  if (!userId) throw new Error('Authentication required');
  const result = await NotificationReceipt.updateMany(
    { userId, channel: 'in_app', isRead: false },
    { $set: { isRead: true, status: 'read', readAt: new Date() } }
  );
  return { updatedCount: result.modifiedCount || 0 };
}
