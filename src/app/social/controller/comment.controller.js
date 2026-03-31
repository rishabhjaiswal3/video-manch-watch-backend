import { emitCommentEvent } from "../../../config/socket.js";
import * as commentService from "../../../services/comment.js";
import { ensureAuthenticatedUser } from "../../../utils/authHelpers.js";
import { resolveStatusCode } from "../../../utils/http.js";

const handleError = (res, error, fallback) => {
  const message = error instanceof Error ? error.message : fallback;
  const statusCode = resolveStatusCode(message, [
    { when: (value) => value.includes("Authentication required"), status: 401 },
    { when: (value) => value.includes("required"), status: 400 },
    { when: (value) => value.includes("not found"), status: 404 },
  ]);
  return res.status(statusCode).json({ success: false, error: message });
};
const isValidId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{6,80}$/.test(value);

export async function getVideoComments(req, res) {
  try {
    const { videoId } = req.params;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
    const page = req.query.page;
    const limit = req.query.limit;
    const userId = req.user?.userId;
    const data = userId
      ? await commentService.getVideoCommentsWithLikeStatus(videoId, userId, page, limit)
      : await commentService.getVideoComments(videoId, page, limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to fetch comments");
  }
}

export async function addComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { videoId } = req.params;
    const { content } = req.body;
    if (!isValidId(videoId)) {
      return res.status(400).json({ success: false, error: "Invalid videoId" });
    }
    if (!String(content || "").trim()) {
      return res.status(400).json({ success: false, error: "content is required" });
    }
    const data = await commentService.addComment(user.userId, videoId, content);

    emitCommentEvent(videoId, "new", {
      comment: data,
      eventVersion: Date.now(),
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to add comment");
  }
}

export async function getCommentReplies(req, res) {
  try {
    const { commentId } = req.params;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    const data = await commentService.getCommentReplies(commentId, req.query.page, req.query.limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to fetch replies");
  }
}

export async function replyToComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { commentId } = req.params;
    const { content } = req.body;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    if (!String(content || "").trim()) {
      return res.status(400).json({ success: false, error: "content is required" });
    }
    const data = await commentService.replyToComment(user.userId, commentId, content);

    emitCommentEvent(data.videoId, "new", {
      comment: data,
      eventVersion: Date.now(),
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to add reply");
  }
}

export async function editComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { commentId } = req.params;
    const { content } = req.body;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    if (!String(content || "").trim()) {
      return res.status(400).json({ success: false, error: "content is required" });
    }
    const data = await commentService.editComment(user.userId, commentId, content);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to edit comment");
  }
}

export async function deleteComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { commentId } = req.params;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    const data = await commentService.deleteComment(user.userId, commentId);

    if (data?.videoId) {
      emitCommentEvent(data.videoId, "delete", {
        commentId,
        parentId: data.parentId,
        eventVersion: Date.now(),
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to delete comment");
  }
}

export async function likeComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { commentId } = req.params;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    const data = await commentService.likeComment(user.userId, commentId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to like comment");
  }
}

export async function unlikeComment(req, res) {
  try {
    const user = ensureAuthenticatedUser(req);
    const { commentId } = req.params;
    if (!isValidId(commentId)) {
      return res.status(400).json({ success: false, error: "Invalid commentId" });
    }
    const data = await commentService.unlikeComment(user.userId, commentId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to unlike comment");
  }
}
