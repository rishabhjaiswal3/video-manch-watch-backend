import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import * as notificationService from '../../../services/notification.js';

export async function registerDevice(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await notificationService.registerDeviceToken(user.userId, req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to register token' });
  }
}

export async function unregisterDevice(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await notificationService.unregisterDeviceToken(user.userId, req.body?.fcmToken);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to unregister token' });
  }
}

export async function getMyNotifications(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await notificationService.getMyNotifications(user.userId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to load notifications' });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await notificationService.markNotificationAsRead(user.userId, req.params.notificationId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(404).json({ success: false, error: err.message || 'Failed to mark as read' });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await notificationService.markAllNotificationsAsRead(user.userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to mark all as read' });
  }
}
