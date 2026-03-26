import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { resolveStatusCode } from '../../../utils/http.js';
import { emitEngagementUpdate } from '../../../config/socket.js';
import * as engagementService from '../../../services/engagement.js';
const isValidId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{6,80}$/.test(value);

export async function likeVideo(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { videoId } = req.params;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
   
    const result = await engagementService.likeVideo(user.userId, videoId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    emitEngagementUpdate(videoId, {
      likeCount: result.data.likeCount,
      dislikeCount: result.data.dislikeCount,
      userEngagement: "like",
      eventVersion: result.version,
    });
    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to like video';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function dislikeVideo(req, res) {
    try {
      const user = ensureAuthenticatedUser(req);
      const { videoId } = req.params;
      if (!isValidId(videoId)) {
        return res.status(400).json({ success: false, error: "Invalid videoId" });
      }
      const result = await engagementService.dislikeVideo(user.userId, videoId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      emitEngagementUpdate(videoId, {
        likeCount: result.data.likeCount,
        dislikeCount: result.data.dislikeCount,
        userEngagement: "dislike",
        eventVersion: result.version,
      });
      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to dislike video';
      const statusCode = resolveStatusCode(message, [
        { when: (value) => value.includes('Authentication required'), status: 401 },
        { when: (value) => value.includes('required'), status: 400 },
        { when: (value) => value.includes('not found'), status: 404 },
      ]);
      return res.status(statusCode).json({ success: false, error: message });
    }
}

export async function removeEngagement(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { videoId } = req.params;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
    const result = await engagementService.removeEngagement(user.userId, videoId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    emitEngagementUpdate(videoId, {
      likeCount: result.data.likeCount,
      dislikeCount: result.data.dislikeCount,
      userEngagement: null,
      eventVersion: result.version,
    });
    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove engagement';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getVideoEngagement(req, res) {
  try {
    const { videoId } = req.params;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
    const data = await engagementService.getVideoEngagement(videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch engagement';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getUserEngagementStatus(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { videoId } = req.params;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
    const data = await engagementService.getUserEngagementStatus(user.userId, videoId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch engagement status';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
      { when: (value) => value.includes('not found'), status: 404 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getUserLikedVideos(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const data = await engagementService.getUserLikedVideos(user.userId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch liked videos';
    const statusCode = resolveStatusCode(message, [
      { when: (value) => value.includes('Authentication required'), status: 401 },
      { when: (value) => value.includes('required'), status: 400 },
    ]);
    return res.status(statusCode).json({ success: false, error: message });
  }
}
