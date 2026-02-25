"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentController = void 0;
const comment_service_js_1 = require("../services/comment.service.js");
const authHelpers_js_1 = require("../../../shared/utils/authHelpers.js");
const socket_js_1 = require("../../../shared/config/socket.js");
const commentService = new comment_service_js_1.CommentService();
class CommentController {
    /**
     * Get video comments
     */
    async getVideoComments(req, res) {
        try {
            const { videoId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            // Check if user is authenticated (optional)
            let userId = null;
            try {
                const user = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
                userId = user.userId;
            }
            catch {
                // User not authenticated, that's fine
            }
            const result = userId
                ? await commentService.getVideoCommentsWithLikeStatus(videoId, userId, page, limit)
                : await commentService.getVideoComments(videoId, page, limit);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[COMMENT] Get video comments error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get comments',
            });
        }
    }
    /**
     * Add a comment to a video
     */
    async addComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { videoId } = req.params;
            const { content } = req.body;
            const comment = await commentService.addComment(userId, videoId, content);
            // Emit real-time event to all users watching this video
            (0, socket_js_1.emitNewComment)(videoId, comment);
            return res.status(201).json({
                success: true,
                data: comment,
            });
        }
        catch (error) {
            console.error('[COMMENT] Add comment error:', error);
            if (error.message === 'Video not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to add comment',
            });
        }
    }
    /**
     * Get replies to a comment
     */
    async getCommentReplies(req, res) {
        try {
            const { commentId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await commentService.getCommentReplies(commentId, page, limit);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[COMMENT] Get replies error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to get replies',
            });
        }
    }
    /**
     * Reply to a comment
     */
    async replyToComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { commentId } = req.params;
            const { content } = req.body;
            const reply = await commentService.replyToComment(userId, commentId, content);
            // Emit real-time event (reply includes videoId from parent)
            if (reply.videoId) {
                (0, socket_js_1.emitNewComment)(reply.videoId, { ...reply, isReply: true, parentId: commentId });
            }
            return res.status(201).json({
                success: true,
                data: reply,
            });
        }
        catch (error) {
            console.error('[COMMENT] Reply to comment error:', error);
            if (error.message === 'Parent comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message.includes('deleted')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to reply to comment',
            });
        }
    }
    /**
     * Edit a comment
     */
    async editComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { commentId } = req.params;
            const { content } = req.body;
            const comment = await commentService.editComment(userId, commentId, content);
            // Emit real-time update to all users watching this video
            if (comment.videoId) {
                (0, socket_js_1.emitUpdateComment)(comment.videoId, comment);
            }
            return res.status(200).json({
                success: true,
                data: comment,
            });
        }
        catch (error) {
            console.error('[COMMENT] Edit comment error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === 'Unauthorized') {
                return res.status(403).json({
                    success: false,
                    error: 'You can only edit your own comments',
                });
            }
            if (error.message.includes('deleted')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to edit comment',
            });
        }
    }
    /**
     * Delete a comment
     */
    async deleteComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { commentId } = req.params;
            const result = await commentService.deleteComment(userId, commentId);
            if (result.deleted && result.videoId) {
                (0, socket_js_1.emitDeleteComment)(result.videoId, { commentId, parentId: result.parentId });
            }
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[COMMENT] Delete comment error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === 'Unauthorized') {
                return res.status(403).json({
                    success: false,
                    error: 'You can only delete your own comments',
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to delete comment',
            });
        }
    }
    /**
     * Like a comment
     */
    async likeComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { commentId } = req.params;
            const result = await commentService.likeComment(userId, commentId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[COMMENT] Like comment error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message.includes('deleted')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to like comment',
            });
        }
    }
    /**
     * Unlike a comment
     */
    async unlikeComment(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { commentId } = req.params;
            const result = await commentService.unlikeComment(userId, commentId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[COMMENT] Unlike comment error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to unlike comment',
            });
        }
    }
}
exports.CommentController = CommentController;
//# sourceMappingURL=comment.controller.js.map