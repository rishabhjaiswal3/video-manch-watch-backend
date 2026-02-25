"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const uuid_1 = require("uuid");
const Comment_js_1 = require("../../../shared/models/Comment.js");
const CommentReaction_js_1 = require("../../../shared/models/CommentReaction.js");
const Video_js_1 = require("../../../shared/models/Video.js");
const Profile_js_1 = require("../../../shared/models/Profile.js");
class CommentService {
    /**
     * Get comments for a video
     */
    async getVideoComments(videoId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        // Get top-level comments only (parentId is null)
        const query = { videoId, parentId: null, isDeleted: false };
        const [comments, total] = await Promise.all([
            Comment_js_1.Comment.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment_js_1.Comment.countDocuments(query),
        ]);
        // Get user profiles for comments
        const userIds = [...new Set(comments.map((c) => c.userId))];
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: userIds } })
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
    async addComment(userId, videoId, content) {
        const video = await Video_js_1.Video.findOne({ videoId, status: 'completed' });
        if (!video) {
            throw new Error('Video not found');
        }
        const commentId = (0, uuid_1.v4)();
        const comment = await Comment_js_1.Comment.create({
            commentId,
            videoId,
            userId,
            content,
        });
        // Increment video comment count
        await Video_js_1.Video.updateOne({ videoId }, { $inc: { commentCount: 1 } });
        // Get user profile
        const profile = await Profile_js_1.Profile.findOne({ userId })
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
    async getCommentReplies(commentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        // Verify parent comment exists
        const parentComment = await Comment_js_1.Comment.findOne({ commentId });
        if (!parentComment) {
            throw new Error('Comment not found');
        }
        const query = { parentId: commentId, isDeleted: false };
        const [replies, total] = await Promise.all([
            Comment_js_1.Comment.find(query)
                .sort({ createdAt: 1 }) // Oldest first for replies
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment_js_1.Comment.countDocuments(query),
        ]);
        // Get user profiles
        const userIds = [...new Set(replies.map((r) => r.userId))];
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: userIds } })
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
    async replyToComment(userId, parentCommentId, content) {
        const parentComment = await Comment_js_1.Comment.findOne({ commentId: parentCommentId });
        if (!parentComment) {
            throw new Error('Parent comment not found');
        }
        if (parentComment.isDeleted) {
            throw new Error('Cannot reply to a deleted comment');
        }
        const commentId = (0, uuid_1.v4)();
        const reply = await Comment_js_1.Comment.create({
            commentId,
            videoId: parentComment.videoId,
            userId,
            parentId: parentCommentId,
            content,
        });
        // Increment parent's reply count
        await Comment_js_1.Comment.updateOne({ commentId: parentCommentId }, { $inc: { replyCount: 1 } });
        // Increment video comment count
        await Video_js_1.Video.updateOne({ videoId: parentComment.videoId }, { $inc: { commentCount: 1 } });
        // Get user profile
        const profile = await Profile_js_1.Profile.findOne({ userId })
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
    async editComment(userId, commentId, content) {
        const comment = await Comment_js_1.Comment.findOne({ commentId });
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
        const profile = await Profile_js_1.Profile.findOne({ userId })
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
    async deleteComment(userId, commentId) {
        const comment = await Comment_js_1.Comment.findOne({ commentId });
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
        await Video_js_1.Video.updateOne({ videoId }, { $inc: { commentCount: -1 } });
        // If this is a reply, decrement parent's reply count
        if (comment.parentId) {
            await Comment_js_1.Comment.updateOne({ commentId: comment.parentId }, { $inc: { replyCount: -1 } });
        }
        return { deleted: true, videoId, parentId };
    }
    /**
     * Like a comment
     */
    async likeComment(userId, commentId) {
        const comment = await Comment_js_1.Comment.findOne({ commentId });
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.isDeleted) {
            throw new Error('Cannot like a deleted comment');
        }
        // Check if already liked
        const existing = await CommentReaction_js_1.CommentReaction.findOne({ commentId, userId });
        if (existing) {
            return { liked: true, isNew: false };
        }
        // Create reaction
        await CommentReaction_js_1.CommentReaction.create({ commentId, userId, type: 'like' });
        // Increment like count
        await Comment_js_1.Comment.updateOne({ commentId }, { $inc: { likeCount: 1 } });
        return { liked: true, isNew: true };
    }
    /**
     * Unlike a comment
     */
    async unlikeComment(userId, commentId) {
        const comment = await Comment_js_1.Comment.findOne({ commentId });
        if (!comment) {
            throw new Error('Comment not found');
        }
        const deleted = await CommentReaction_js_1.CommentReaction.findOneAndDelete({ commentId, userId });
        if (!deleted) {
            return { unliked: false };
        }
        // Decrement like count
        await Comment_js_1.Comment.updateOne({ commentId }, { $inc: { likeCount: -1 } });
        return { unliked: true };
    }
    /**
     * Check if user has liked a comment
     */
    async hasUserLikedComment(userId, commentId) {
        const reaction = await CommentReaction_js_1.CommentReaction.findOne({ commentId, userId });
        return !!reaction;
    }
    /**
     * Get comments with user's like status
     */
    async getVideoCommentsWithLikeStatus(videoId, userId, page = 1, limit = 20) {
        const result = await this.getVideoComments(videoId, page, limit);
        if (!userId) {
            return result;
        }
        // Get user's reactions
        const commentIds = result.comments.map((c) => c.commentId);
        const reactions = await CommentReaction_js_1.CommentReaction.find({
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
exports.CommentService = CommentService;
//# sourceMappingURL=comment.service.js.map