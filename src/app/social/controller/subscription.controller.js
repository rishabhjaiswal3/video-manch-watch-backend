import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { emitSubscriptionUpdate } from '../../../config/socket.js';
import { resolveStatusCode } from '../../../utils/http.js';
import * as subscriptionService from '../../../services/subscription.js';

export async function subscribe(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { creatorId } = req.params;
    const result = await subscriptionService.subscribe(user.userId, creatorId);
    emitSubscriptionUpdate(creatorId, {
      subscriberCount: result.subscriberCount,
      eventVersion: Date.now(),
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err.message || 'Failed to subscribe';
    const status = resolveStatusCode(message, [
      { when: (v) => v.includes('Authentication'), status: 401 },
      { when: (v) => v.includes('required'),       status: 400 },
      { when: (v) => v.includes('yourself'),        status: 400 },
    ]);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function unsubscribe(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { creatorId } = req.params;
    const result = await subscriptionService.unsubscribe(user.userId, creatorId);
    emitSubscriptionUpdate(creatorId, {
      subscriberCount: result.subscriberCount,
      eventVersion: Date.now(),
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err.message || 'Failed to unsubscribe';
    const status = resolveStatusCode(message, [
      { when: (v) => v.includes('Authentication'), status: 401 },
      { when: (v) => v.includes('required'),       status: 400 },
    ]);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function getSubscriptionStatus(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { creatorId } = req.params;
    const data = await subscriptionService.getSubscriptionStatus(user.userId, creatorId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to get subscription status';
    const status = resolveStatusCode(message, [
      { when: (v) => v.includes('Authentication'), status: 401 },
      { when: (v) => v.includes('required'),       status: 400 },
    ]);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function toggleNotifications(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { creatorId } = req.params;
    const enabled = req.body?.enabled !== false;
    const data = await subscriptionService.toggleNotifications(user.userId, creatorId, enabled);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to toggle notifications';
    const status = resolveStatusCode(message, [
      { when: (v) => v.includes('Authentication'), status: 401 },
    ]);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function getFollowing(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await subscriptionService.getFollowing(user.userId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to get following';
    const status = resolveStatusCode(message, [
      { when: (v) => v.includes('Authentication'), status: 401 },
    ]);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function getSubscribers(req, res) {
  try {
    const { creatorId } = req.params;
    const data = await subscriptionService.getSubscribers(creatorId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err.message || 'Failed to get subscribers';
    return res.status(500).json({ success: false, error: message });
  }
}
