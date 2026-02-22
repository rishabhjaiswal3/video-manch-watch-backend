"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveController = void 0;
const live_service_js_1 = require("../services/live.service.js");
const authHelpers_js_1 = require("../../../utils/authHelpers.js");
const socket_js_1 = require("../../../config/socket.js");
const liveStreamService = new live_service_js_1.LiveStreamService();
class LiveController {
    /**
     * Create a new live stream
     */
    async createStream(req, res) {
        try {
            const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            // Any authenticated user can create live streams
            const result = await liveStreamService.createStream(userId, userType, req.body);
            return res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[LIVE] Create stream error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create stream',
            });
        }
    }
    /**
     * Get active live streams (public)
     */
    async getActiveStreams(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const category = req.query.category;
            const result = await liveStreamService.getActiveStreams(page, limit, category);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[LIVE] Get active streams error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get live streams',
            });
        }
    }
    /**
     * Get stream details (public)
     */
    async getStreamDetails(req, res) {
        try {
            const { streamId } = req.params;
            const stream = await liveStreamService.getStreamDetails(streamId);
            if (!stream) {
                return res.status(404).json({
                    success: false,
                    error: 'Stream not found',
                });
            }
            return res.status(200).json({
                success: true,
                data: stream,
            });
        }
        catch (error) {
            console.error('[LIVE] Get stream details error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get stream details',
            });
        }
    }
    /**
     * Get stream key (owner only)
     */
    async getStreamKey(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId } = req.params;
            const streamKey = await liveStreamService.getStreamKey(userId, streamId);
            return res.status(200).json({
                success: true,
                data: {
                    streamKey,
                    rtmpUrl: process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live',
                },
            });
        }
        catch (error) {
            console.error('[LIVE] Get stream key error:', error);
            if (error.message === 'Stream not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to get stream key',
            });
        }
    }
    /**
     * Regenerate stream key
     */
    async regenerateStreamKey(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId } = req.params;
            const streamKey = await liveStreamService.regenerateStreamKey(userId, streamId);
            return res.status(200).json({
                success: true,
                data: {
                    streamKey,
                    rtmpUrl: process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live',
                },
            });
        }
        catch (error) {
            console.error('[LIVE] Regenerate stream key error:', error);
            if (error.message === 'Stream not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message.includes('live')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to regenerate stream key',
            });
        }
    }
    /**
     * Update stream metadata
     */
    async updateStream(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId } = req.params;
            const stream = await liveStreamService.updateStream(userId, streamId, req.body);
            return res.status(200).json({
                success: true,
                data: stream,
            });
        }
        catch (error) {
            console.error('[LIVE] Update stream error:', error);
            if (error.message === 'Stream not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to update stream',
            });
        }
    }
    /**
     * Start stream (internal/webhook - called by transcoding engine)
     */
    async startStream(req, res) {
        try {
            const { streamId } = req.params;
            const { playbackR2Key } = req.body;
            // Verify internal secret for webhook calls
            const internalSecret = req.headers['x-internal-secret'];
            if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
                // If no internal secret, require auth and ownership
                const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
                const stream = await liveStreamService.getStreamById(streamId);
                if (!stream || stream.userId !== userId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Unauthorized',
                    });
                }
            }
            const stream = await liveStreamService.startStream(streamId, playbackR2Key);
            if (!stream) {
                return res.status(400).json({
                    success: false,
                    error: 'Stream cannot be started',
                });
            }
            // Emit real-time event
            (0, socket_js_1.emitLiveStarted)(streamId, {
                streamId: stream.streamId,
                title: stream.title,
                userId: stream.userId,
            });
            return res.status(200).json({
                success: true,
                data: { streamId: stream.streamId, status: stream.status },
            });
        }
        catch (error) {
            console.error('[LIVE] Start stream error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to start stream',
            });
        }
    }
    /**
     * End stream
     */
    async endStream(req, res) {
        try {
            const { streamId } = req.params;
            // Check for internal webhook or authenticated user
            const internalSecret = req.headers['x-internal-secret'];
            let userId;
            if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
                const user = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
                userId = user.userId;
            }
            const stream = await liveStreamService.endStream(streamId, userId);
            // Emit real-time event
            (0, socket_js_1.emitLiveEnded)(streamId);
            return res.status(200).json({
                success: true,
                data: {
                    streamId: stream?.streamId,
                    status: stream?.status,
                    duration: stream?.duration,
                },
            });
        }
        catch (error) {
            console.error('[LIVE] End stream error:', error);
            if (error.message === 'Stream not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to end stream',
            });
        }
    }
    /**
     * Get creator's streams (my streams)
     */
    async getMyStreams(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const result = await liveStreamService.getCreatorStreams(userId, page, limit, status);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('[LIVE] Get my streams error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get streams',
            });
        }
    }
    /**
     * Delete stream
     */
    async deleteStream(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId } = req.params;
            await liveStreamService.deleteStream(userId, streamId);
            return res.status(200).json({
                success: true,
                data: { deleted: true },
            });
        }
        catch (error) {
            console.error('[LIVE] Delete stream error:', error);
            if (error.message === 'Stream not found') {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message.includes('live')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to delete stream',
            });
        }
    }
    /**
     * Validate stream key (for RTMP ingest)
     */
    async validateStreamKey(req, res) {
        try {
            const { streamKey } = req.body;
            const stream = await liveStreamService.getStreamByKey(streamKey);
            if (!stream) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid stream key',
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    streamId: stream.streamId,
                    userId: stream.userId,
                    userType: stream.userType,
                    title: stream.title,
                    description: stream.description,
                    category: stream.category,
                    recordingEnabled: stream.recordingEnabled,
                },
            });
        }
        catch (error) {
            console.error('[LIVE] Validate stream key error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to validate stream key',
            });
        }
    }
    /**
     * Update viewer count (internal)
     */
    async updateViewerCount(req, res) {
        try {
            const { streamId } = req.params;
            const { count } = req.body;
            await liveStreamService.updateViewerCount(streamId, count);
            // Emit real-time update
            (0, socket_js_1.emitLiveViewerCount)(streamId, count);
            return res.status(200).json({
                success: true,
            });
        }
        catch (error) {
            console.error('[LIVE] Update viewer count error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update viewer count',
            });
        }
    }
    /**
     * Get signed playback URL for a live stream
     */
    async getPlaybackUrl(req, res) {
        try {
            const { streamId } = req.params;
            const data = await liveStreamService.getSignedPlayback(streamId);
            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Playback not available',
                });
            }
            return res.status(200).json({
                success: true,
                data,
            });
        }
        catch (error) {
            console.error('[LIVE] Get playback URL error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get playback URL',
            });
        }
    }
    /**
     * Link a recorded VOD to a live stream (internal)
     */
    async linkVod(req, res) {
        try {
            const internalKey = req.headers['x-internal-key'];
            if (internalKey !== process.env.INTERNAL_API_KEY) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized',
                });
            }
            const { streamId } = req.params;
            const { videoId } = req.body;
            if (!videoId) {
                return res.status(400).json({
                    success: false,
                    error: 'videoId is required',
                });
            }
            await liveStreamService.linkRecordedVideo(streamId, videoId);
            return res.status(200).json({
                success: true,
                data: { streamId, videoId },
            });
        }
        catch (error) {
            console.error('[LIVE] Link VOD error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to link VOD',
            });
        }
    }
    // ========================
    // Chat Methods
    // ========================
    /**
     * Get chat messages for a stream
     */
    async getChatMessages(req, res) {
        try {
            const { streamId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            const before = req.query.before ? new Date(req.query.before) : undefined;
            const messages = await liveStreamService.getChatMessages(streamId, limit, before);
            return res.status(200).json({
                success: true,
                data: { messages },
            });
        }
        catch (error) {
            console.error('[LIVE] Get chat messages error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get chat messages',
            });
        }
    }
    /**
     * Send chat message
     */
    async sendChatMessage(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId } = req.params;
            const { message } = req.body;
            // Verify stream exists and chat is enabled
            const stream = await liveStreamService.getStreamById(streamId);
            if (!stream) {
                return res.status(404).json({
                    success: false,
                    error: 'Stream not found',
                });
            }
            if (!stream.chatEnabled) {
                return res.status(403).json({
                    success: false,
                    error: 'Chat is disabled for this stream',
                });
            }
            const chatMessage = await liveStreamService.saveChatMessage(streamId, userId, message);
            // Emit real-time event
            (0, socket_js_1.emitLiveChatMessage)(streamId, chatMessage);
            return res.status(201).json({
                success: true,
                data: chatMessage,
            });
        }
        catch (error) {
            console.error('[LIVE] Send chat message error:', error);
            if (error.message === 'Profile not found') {
                return res.status(400).json({
                    success: false,
                    error: 'Please create a profile before chatting',
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to send message',
            });
        }
    }
    /**
     * Delete chat message
     */
    async deleteChatMessage(req, res) {
        try {
            const { userId, userType } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId, messageId } = req.params;
            const isAdmin = userType === 'admin';
            await liveStreamService.deleteChatMessage(messageId, userId, isAdmin);
            return res.status(200).json({
                success: true,
                data: { deleted: true },
            });
        }
        catch (error) {
            console.error('[LIVE] Delete chat message error:', error);
            if (error.message.includes('not found') || error.message.includes('unauthorized')) {
                return res.status(404).json({
                    success: false,
                    error: 'Message not found or unauthorized',
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to delete message',
            });
        }
    }
    /**
     * Pin chat message (stream owner only)
     */
    async pinChatMessage(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { streamId, messageId } = req.params;
            // Verify ownership
            const stream = await liveStreamService.getStreamById(streamId);
            if (!stream || stream.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only the stream owner can pin messages',
                });
            }
            await liveStreamService.pinChatMessage(streamId, messageId);
            return res.status(200).json({
                success: true,
                data: { pinned: true },
            });
        }
        catch (error) {
            console.error('[LIVE] Pin chat message error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to pin message',
            });
        }
    }
}
exports.LiveController = LiveController;
//# sourceMappingURL=live.controller.js.map