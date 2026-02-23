import { v4 as uuidv4 } from 'uuid';
import { Comment } from '../../../shared/models/Comment.js';
import { CommentReaction } from '../../../shared/models/CommentReaction.js';
import { Video } from '../../../shared/models/Video.js';
import { Profile } from '../../../shared/models/Profile.js';

export class CommentService {
  /**
   * Get comments for a video
   */
  async getVideoComments(
    videoId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    comments: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    // Get top-level comments only (parentId is null)
    const query = { videoId, parentId: null, isDeleted: false };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);

    // Get user profiles for comments
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const profiles = await Profile.find({ userId: { $in: userIds } })
      .select('userId username displayName avatar isVerified')
      .lean();

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Enrich comments with user info
    const enrichedComments = comments.map((comment) => ({
      ...comment,
      user: profileMap.get(comment.userId) || { userId: comment.userId },
    }));

    return {
      comments: enrichedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add a comment to a video
   */
  async addComment(
    userId: string,
    videoId: string,
    content: string
  ): Promise<any> {
    const video = await Video.findOne({ videoId, status: 'completed' });
    if (!video) {
      throw new Error('Video not found');
    }

    const commentId = uuidv4();

    const comment = await Comment.create({
      commentId,
      videoId,
      userId,
      content,
    });

    // Increment video comment count
    await Video.updateOne({ videoId }, { $inc: { commentCount: 1 } });

    // Get user profile
    const profile = await Profile.findOne({ userId })
      .select('userId username displayName avatar isVerified')
      .lean();

    return {
      ...comment.toObject(),
      user: profile || { userId },
    };
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(
    commentId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    replies: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    // Verify parent comment exists
    const parentComment = await Comment.findOne({ commentId });
    if (!parentComment) {
      throw new Error('Comment not found');
    }

    const query = { parentId: commentId, isDeleted: false };

    const [replies, total] = await Promise.all([
      Comment.find(query)
        .sort({ createdAt: 1 }) // Oldest first for replies
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);

    // Get user profiles
    const userIds = [...new Set(replies.map((r) => r.userId))];
    const profiles = await Profile.find({ userId: { $in: userIds } })
      .select('userId username displayName avatar isVerified')
      .lean();

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enrichedReplies = replies.map((reply) => ({
      ...reply,
      user: profileMap.get(reply.userId) || { userId: reply.userId },
    }));

    return {
      replies: enrichedReplies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    userId: string,
    parentCommentId: string,
    content: string
  ): Promise<any> {
    const parentComment = await Comment.findOne({ commentId: parentCommentId });
    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    if (parentComment.isDeleted) {
      throw new Error('Cannot reply to a deleted comment');
    }

    const commentId = uuidv4();

    const reply = await Comment.create({
      commentId,
      videoId: parentComment.videoId,
      userId,
      parentId: parentCommentId,
      content,
    });

    // Increment parent's reply count
    await Comment.updateOne(
      { commentId: parentCommentId },
      { $inc: { replyCount: 1 } }
    );

    // Increment video comment count
    await Video.updateOne(
      { videoId: parentComment.videoId },
      { $inc: { commentCount: 1 } }
    );

    // Get user profile
    const profile = await Profile.findOne({ userId })
      .select('userId username displayName avatar isVerified')
      .lean();

    return {
      ...reply.toObject(),
      user: profile || { userId },
    };
  }

  /**
   * Edit a comment
   */
  async editComment(
    userId: string,
    commentId: string,
    content: string
  ): Promise<any> {
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (comment.isDeleted) {
      throw new Error('Cannot edit a deleted comment');
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Get user profile
    const profile = await Profile.findOne({ userId })
      .select('userId username displayName avatar isVerified')
      .lean();

    return {
      ...comment.toObject(),
      user: profile || { userId },
    };
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(
    userId: string,
    commentId: string
  ): Promise<{ deleted: boolean; videoId?: string; parentId?: string | null }> {
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (comment.isDeleted) {
      return { deleted: false };
    }

    const videoId = comment.videoId;
    const parentId = comment.parentId ?? null;

    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();

    // Decrement video comment count
    await Video.updateOne(
      { videoId },
      { $inc: { commentCount: -1 } }
    );

    // If this is a reply, decrement parent's reply count
    if (comment.parentId) {
      await Comment.updateOne(
        { commentId: comment.parentId },
        { $inc: { replyCount: -1 } }
      );
    }

    return { deleted: true, videoId, parentId };
  }

  /**
   * Like a comment
   */
  async likeComment(userId: string, commentId: string): Promise<{ liked: boolean; isNew: boolean }> {
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.isDeleted) {
      throw new Error('Cannot like a deleted comment');
    }

    // Check if already liked
    const existing = await CommentReaction.findOne({ commentId, userId });
    if (existing) {
      return { liked: true, isNew: false };
    }

    // Create reaction
    await CommentReaction.create({ commentId, userId, type: 'like' });

    // Increment like count
    await Comment.updateOne({ commentId }, { $inc: { likeCount: 1 } });

    return { liked: true, isNew: true };
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(userId: string, commentId: string): Promise<{ unliked: boolean }> {
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    const deleted = await CommentReaction.findOneAndDelete({ commentId, userId });
    if (!deleted) {
      return { unliked: false };
    }

    // Decrement like count
    await Comment.updateOne({ commentId }, { $inc: { likeCount: -1 } });

    return { unliked: true };
  }

  /**
   * Check if user has liked a comment
   */
  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    const reaction = await CommentReaction.findOne({ commentId, userId });
    return !!reaction;
  }

  /**
   * Get comments with user's like status
   */
  async getVideoCommentsWithLikeStatus(
    videoId: string,
    userId: string | null,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    comments: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const result = await this.getVideoComments(videoId, page, limit);

    if (!userId) {
      return result;
    }

    // Get user's reactions
    const commentIds = result.comments.map((c) => c.commentId);
    const reactions = await CommentReaction.find({
      commentId: { $in: commentIds },
      userId,
    }).lean();

    const likedSet = new Set(reactions.map((r) => r.commentId));

    // Add like status to comments
    result.comments = result.comments.map((comment) => ({
      ...comment,
      isLikedByUser: likedSet.has(comment.commentId),
    }));

    return result;
  }
}
