import crypto from "crypto";
import { Comment } from "../app/social/model/Comment.js";
import { CommentLike } from "../app/social/model/CommentLike.js";
import { Video } from "../app/media/model/Video.js";
import { Profile } from "../app/user/model/Profile.js";

const normalizePagination = (page, limit) => {
  const p = Math.max(1, Number.parseInt(page || "1", 10) || 1);
  const l = Math.max(1, Math.min(100, Number.parseInt(limit || "20", 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const buildProfileMap = async (userIds) => {
  if (!userIds.length) return new Map();
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId username displayName avatar")
    .lean();
  return new Map(profiles.map((profile) => [profile.userId, profile]));
};

const hydrateComment = (comment, profile, liked = false) => ({
  commentId: comment.commentId,
  videoId: comment.videoId,
  parentId: comment.parentId,
  content: comment.content,
  likeCount: comment.likeCount || 0,
  replyCount: comment.replyCount || 0,
  isEdited: Boolean(comment.isEdited),
  createdAt: comment.createdAt,
  isLikedByUser: liked,
  user: {
    userId: comment.userId,
    username: profile?.username,
    displayName: profile?.displayName,
    avatar: profile?.avatar,
  },
});

export async function getVideoComments(videoId, page, limit) {
  if (!videoId) throw new Error("videoId is required");

  const { page: p, limit: l, skip } = normalizePagination(page, limit);
  const query = { videoId, parentId: null, isDeleted: false };

  const [comments, total] = await Promise.all([
    Comment.find(query).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    Comment.countDocuments(query),
  ]);

  const profileMap = await buildProfileMap([...new Set(comments.map((comment) => comment.userId))]);
  const hydrated = comments.map((comment) => hydrateComment(comment, profileMap.get(comment.userId)));

  return {
    comments: hydrated,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.max(1, Math.ceil(total / l)),
    },
  };
}

export async function getVideoCommentsWithLikeStatus(videoId, userId, page, limit) {
  const data = await getVideoComments(videoId, page, limit);
  if (!userId || data.comments.length === 0) return data;

  const likedCommentIds = await CommentLike.find({
    userId,
    commentId: { $in: data.comments.map((comment) => comment.commentId) },
  })
    .select("commentId")
    .lean();

  const likedSet = new Set(likedCommentIds.map((item) => item.commentId));
  data.comments = data.comments.map((comment) => ({
    ...comment,
    isLikedByUser: likedSet.has(comment.commentId),
  }));
  return data;
}

export async function addComment(userId, videoId, content) {
  if (!userId) throw new Error("Authentication required");
  if (!videoId) throw new Error("videoId is required");
  const normalized = String(content || "").trim();
  if (!normalized) throw new Error("content is required");

  const video = await Video.findOne({ videoId }).select("videoId allowComments");
  if (!video) throw new Error("video not found");
  if (video.allowComments === false) throw new Error("comments are disabled for this video");

  const commentDoc = await Comment.create({
    commentId: crypto.randomUUID(),
    videoId,
    userId,
    parentId: null,
    content: normalized,
  });

  await Video.updateOne({ videoId }, { $inc: { commentCount: 1 } });

  const profile = await Profile.findOne({ userId }).select("userId username displayName avatar").lean();
  return hydrateComment(commentDoc.toObject(), profile, false);
}

export async function getCommentReplies(commentId, page, limit) {
  if (!commentId) throw new Error("commentId is required");
  const { page: p, limit: l, skip } = normalizePagination(page, limit);

  const query = { parentId: commentId, isDeleted: false };
  const [replies, total] = await Promise.all([
    Comment.find(query).sort({ createdAt: 1 }).skip(skip).limit(l).lean(),
    Comment.countDocuments(query),
  ]);

  const profileMap = await buildProfileMap([...new Set(replies.map((comment) => comment.userId))]);
  const hydrated = replies.map((reply) => hydrateComment(reply, profileMap.get(reply.userId)));

  return {
    replies: hydrated,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.max(1, Math.ceil(total / l)),
    },
  };
}

export async function replyToComment(userId, commentId, content) {
  if (!userId) throw new Error("Authentication required");
  if (!commentId) throw new Error("commentId is required");
  const normalized = String(content || "").trim();
  if (!normalized) throw new Error("content is required");

  const parent = await Comment.findOne({ commentId, isDeleted: false }).lean();
  if (!parent) throw new Error("comment not found");

  const replyDoc = await Comment.create({
    commentId: crypto.randomUUID(),
    videoId: parent.videoId,
    userId,
    parentId: commentId,
    content: normalized,
  });

  await Promise.all([
    Comment.updateOne({ commentId }, { $inc: { replyCount: 1 } }),
    Video.updateOne({ videoId: parent.videoId }, { $inc: { commentCount: 1 } }),
  ]);

  const profile = await Profile.findOne({ userId }).select("userId username displayName avatar").lean();
  return hydrateComment(replyDoc.toObject(), profile, false);
}

export async function editComment(userId, commentId, content) {
  if (!userId) throw new Error("Authentication required");
  if (!commentId) throw new Error("commentId is required");
  const normalized = String(content || "").trim();
  if (!normalized) throw new Error("content is required");

  const comment = await Comment.findOne({ commentId, isDeleted: false });
  if (!comment) throw new Error("comment not found");
  if (comment.userId !== userId) throw new Error("Access denied");

  comment.content = normalized;
  comment.isEdited = true;
  await comment.save();

  const profile = await Profile.findOne({ userId }).select("userId username displayName avatar").lean();
  return hydrateComment(comment.toObject(), profile, false);
}

export async function deleteComment(userId, commentId) {
  if (!userId) throw new Error("Authentication required");
  if (!commentId) throw new Error("commentId is required");

  const comment = await Comment.findOne({ commentId, isDeleted: false });
  if (!comment) throw new Error("comment not found");
  if (comment.userId !== userId) throw new Error("Access denied");

  const parentId = comment.parentId;
  const videoId = comment.videoId;

  comment.isDeleted = true;
  await comment.save();

  const ops = [Video.updateOne({ videoId }, { $inc: { commentCount: -1 } })];
  if (parentId) {
    ops.push(Comment.updateOne({ commentId: parentId }, { $inc: { replyCount: -1 } }));
  }
  await Promise.all(ops);

  return { deleted: true, videoId, parentId };
}

export async function likeComment(userId, commentId) {
  if (!userId) throw new Error("Authentication required");
  if (!commentId) throw new Error("commentId is required");

  const comment = await Comment.findOne({ commentId, isDeleted: false });
  if (!comment) throw new Error("comment not found");

  const existing = await CommentLike.findOne({ commentId, userId }).lean();
  if (existing) return { liked: true, alreadyLiked: true };

  await Promise.all([
    CommentLike.create({ commentId, userId }),
    Comment.updateOne({ commentId }, { $inc: { likeCount: 1 } }),
  ]);

  return { liked: true };
}

export async function unlikeComment(userId, commentId) {
  if (!userId) throw new Error("Authentication required");
  if (!commentId) throw new Error("commentId is required");

  const removed = await CommentLike.findOneAndDelete({ commentId, userId }).lean();
  if (!removed) return { liked: false, alreadyUnliked: true };

  await Comment.updateOne({ commentId }, { $inc: { likeCount: -1 } });
  return { liked: false };
}
