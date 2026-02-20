"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveStreamService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const LiveStream_js_1 = require("../../../models/LiveStream.js");
const LiveChat_js_1 = require("../../../models/LiveChat.js");
const Profile_js_1 = require("../../../models/Profile.js");
const signedUrl_js_1 = require("../../../utils/signedUrl.js");
class LiveStreamService {
    rtmpBaseUrl;
    constructor() {
        this.rtmpBaseUrl = process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live';
    }
    /**
     * Generate a cryptographically secure stream key
     */
    generateStreamKey() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Create a new live stream
     */
    async createStream(userId, userType, data) {
        const streamId = (0, uuid_1.v4)();
        const streamKey = this.generateStreamKey();
        const stream = await LiveStream_js_1.LiveStream.create({
            streamId,
            userId,
            userType,
            streamKey,
            rtmpUrl: this.rtmpBaseUrl,
            title: data.title,
            description: data.description,
            category: data.category,
            tags: data.tags,
            recordingEnabled: data.recordingEnabled ?? true,
            chatEnabled: data.chatEnabled ?? true,
            isAdultContent: data.isAdultContent ?? false,
            scheduledAt: data.scheduledAt,
            status: 'created',
            statusHistory: [{
                    from: 'created',
                    to: 'created',
                    at: new Date(),
                    reason: 'Stream created',
                }],
        });
        return {
            streamId: stream.streamId,
            streamKey: stream.streamKey,
            rtmpUrl: stream.rtmpUrl,
            rtmpFullUrl: `${stream.rtmpUrl}/${stream.streamKey}`,
            playbackUrl: this.getPlaybackUrl(streamId),
            status: stream.status,
            title: stream.title,
            description: stream.description,
            category: stream.category,
            tags: stream.tags,
            recordingEnabled: stream.recordingEnabled,
            chatEnabled: stream.chatEnabled,
            createdAt: stream.createdAt,
        };
    }
    /**
     * Get stream by ID
     */
    async getStreamById(streamId, includeKey = false) {
        const selectFields = includeKey ? '' : '-streamKey';
        return LiveStream_js_1.LiveStream.findOne({ streamId }).select(selectFields);
    }
    /**
     * Get stream by stream key (for RTMP ingest validation)
     */
    async getStreamByKey(streamKey) {
        return LiveStream_js_1.LiveStream.findOne({ streamKey, status: { $in: ['created', 'ready'] } });
    }
    /**
     * Get stream details with streamer profile
     */
    async getStreamDetails(streamId, signUrls = true) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId }).select('-streamKey');
        if (!stream)
            return null;
        const profile = await Profile_js_1.Profile.findOne({ userId: stream.userId });
        let playbackUrl = stream.playbackUrl;
        if (signUrls && stream.status === 'live' && stream.playbackR2Key) {
            // Generate signed URL for playback
            const expiresIn = 3600; // 1 hour
            playbackUrl = (0, signedUrl_js_1.generateSignedUrl)({
                videoId: streamId,
                path: stream.playbackR2Key,
                expiresIn: expiresIn
            }).signedPath;
        }
        return {
            streamId: stream.streamId,
            userId: stream.userId,
            title: stream.title,
            description: stream.description,
            thumbnail: stream.thumbnail,
            category: stream.category,
            tags: stream.tags,
            status: stream.status,
            viewerCount: stream.viewerCount,
            startedAt: stream.startedAt,
            duration: stream.duration,
            chatEnabled: stream.chatEnabled,
            playbackUrl,
            streamer: profile ? {
                username: profile.username,
                displayName: profile.displayName,
                avatar: profile.avatar,
                isVerified: profile.isVerified,
            } : undefined,
        };
    }
    /**
     * Get stream key for owner
     */
    async getStreamKey(userId, streamId) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId, userId });
        if (!stream) {
            throw new Error('Stream not found');
        }
        return stream.streamKey;
    }
    /**
     * Regenerate stream key
     */
    async regenerateStreamKey(userId, streamId) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId, userId });
        if (!stream) {
            throw new Error('Stream not found');
        }
        if (stream.status === 'live') {
            throw new Error('Cannot regenerate key while stream is live');
        }
        const newStreamKey = this.generateStreamKey();
        stream.streamKey = newStreamKey;
        await stream.save();
        return newStreamKey;
    }
    /**
     * Mark stream as ready (called when RTMP connection established)
     */
    async markStreamReady(streamKey) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamKey });
        if (!stream || stream.status !== 'created')
            return null;
        return this.updateStreamStatus(stream, 'ready', 'RTMP connection established');
    }
    /**
     * Start stream (called when first frame received)
     */
    async startStream(streamId, playbackR2Key) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId });
        if (!stream || !['created', 'ready'].includes(stream.status))
            return null;
        stream.startedAt = new Date();
        if (playbackR2Key) {
            stream.playbackR2Key = playbackR2Key;
            stream.playbackUrl = this.getPlaybackUrl(streamId);
        }
        return this.updateStreamStatus(stream, 'live', 'Stream started');
    }
    /**
     * End stream
     */
    async endStream(streamId, userId) {
        const query = { streamId };
        if (userId) {
            query.userId = userId;
        }
        const stream = await LiveStream_js_1.LiveStream.findOne(query);
        if (!stream) {
            throw new Error('Stream not found');
        }
        if (stream.status === 'ended') {
            return stream;
        }
        stream.endedAt = new Date();
        if (stream.startedAt) {
            stream.duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
        }
        return this.updateStreamStatus(stream, 'ended', 'Stream ended');
    }
    /**
     * Mark stream as failed
     */
    async markStreamFailed(streamId, reason) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId });
        if (!stream)
            return null;
        stream.endedAt = new Date();
        return this.updateStreamStatus(stream, 'failed', reason);
    }
    /**
     * Update stream status with history
     */
    async updateStreamStatus(stream, newStatus, reason) {
        const oldStatus = stream.status;
        stream.status = newStatus;
        stream.statusHistory = stream.statusHistory || [];
        stream.statusHistory.push({
            from: oldStatus,
            to: newStatus,
            at: new Date(),
            reason,
        });
        await stream.save();
        return stream;
    }
    /**
     * Update stream metadata
     */
    async updateStream(userId, streamId, data) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId, userId });
        if (!stream) {
            throw new Error('Stream not found');
        }
        if (data.title)
            stream.title = data.title;
        if (data.description !== undefined)
            stream.description = data.description;
        if (data.category !== undefined)
            stream.category = data.category;
        if (data.tags !== undefined)
            stream.tags = data.tags;
        if (data.chatEnabled !== undefined)
            stream.chatEnabled = data.chatEnabled;
        if (data.isAdultContent !== undefined)
            stream.isAdultContent = data.isAdultContent;
        await stream.save();
        return stream;
    }
    /**
     * Get active (live) streams
     */
    async getActiveStreams(page = 1, limit = 20, category) {
        const query = { status: 'live' };
        if (category) {
            query.category = category;
        }
        const [streams, total] = await Promise.all([
            LiveStream_js_1.LiveStream.find(query)
                .select('-streamKey')
                .sort({ viewerCount: -1, startedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            LiveStream_js_1.LiveStream.countDocuments(query),
        ]);
        // Get streamer profiles
        const userIds = [...new Set(streams.map((s) => s.userId))];
        const profiles = await Profile_js_1.Profile.find({ userId: { $in: userIds } });
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        const streamDetails = streams.map((stream) => {
            const profile = profileMap.get(stream.userId);
            return {
                streamId: stream.streamId,
                userId: stream.userId,
                title: stream.title,
                description: stream.description,
                thumbnail: stream.thumbnail,
                category: stream.category,
                tags: stream.tags,
                status: stream.status,
                viewerCount: stream.viewerCount,
                startedAt: stream.startedAt,
                duration: stream.duration,
                chatEnabled: stream.chatEnabled,
                playbackUrl: stream.playbackUrl,
                streamer: profile ? {
                    username: profile.username,
                    displayName: profile.displayName,
                    avatar: profile.avatar,
                    isVerified: profile.isVerified,
                } : undefined,
            };
        });
        return {
            streams: streamDetails,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get creator's streams (history)
     */
    async getCreatorStreams(userId, page = 1, limit = 20, status) {
        const query = { userId };
        if (status) {
            query.status = status;
        }
        const [streams, total] = await Promise.all([
            LiveStream_js_1.LiveStream.find(query)
                .select('-streamKey')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            LiveStream_js_1.LiveStream.countDocuments(query),
        ]);
        return {
            streams,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update viewer count
     */
    async updateViewerCount(streamId, count) {
        await LiveStream_js_1.LiveStream.updateOne({ streamId }, {
            $set: { viewerCount: count },
            $max: { peakViewers: count },
            $inc: { totalViews: count > 0 ? 1 : 0 },
        });
    }
    /**
     * Increment viewer count
     */
    async incrementViewerCount(streamId) {
        const stream = await LiveStream_js_1.LiveStream.findOneAndUpdate({ streamId }, {
            $inc: { viewerCount: 1, totalViews: 1 },
        }, { new: true });
        if (stream && stream.viewerCount > stream.peakViewers) {
            await LiveStream_js_1.LiveStream.updateOne({ streamId }, { $set: { peakViewers: stream.viewerCount } });
        }
        return stream?.viewerCount || 0;
    }
    /**
     * Decrement viewer count
     */
    async decrementViewerCount(streamId) {
        const stream = await LiveStream_js_1.LiveStream.findOneAndUpdate({ streamId, viewerCount: { $gt: 0 } }, { $inc: { viewerCount: -1 } }, { new: true });
        return stream?.viewerCount || 0;
    }
    /**
     * Update stream thumbnail
     */
    async updateThumbnail(streamId, thumbnailUrl) {
        await LiveStream_js_1.LiveStream.updateOne({ streamId }, { $set: { thumbnail: thumbnailUrl } });
    }
    /**
     * Link recorded video to stream
     */
    async linkRecordedVideo(streamId, videoId) {
        await LiveStream_js_1.LiveStream.updateOne({ streamId }, { $set: { recordedVideoId: videoId } });
    }
    /**
     * Get playback URL for a stream
     */
    getPlaybackUrl(streamId) {
        const baseUrl = process.env.R2_PUBLIC_URL || '';
        return `${baseUrl}/live/${streamId}/master.m3u8`;
    }
    // ========================
    // Chat Methods
    // ========================
    /**
     * Save chat message
     */
    async saveChatMessage(streamId, userId, message) {
        const profile = await Profile_js_1.Profile.findOne({ userId });
        if (!profile) {
            throw new Error('Profile not found');
        }
        const chatMessage = await LiveChat_js_1.LiveChatMessage.create({
            messageId: (0, uuid_1.v4)(),
            streamId,
            userId,
            username: profile.username,
            avatar: profile.avatar,
            message,
            type: 'message',
        });
        return {
            messageId: chatMessage.messageId,
            streamId: chatMessage.streamId,
            userId: chatMessage.userId,
            username: chatMessage.username,
            avatar: chatMessage.avatar,
            message: chatMessage.message,
            type: chatMessage.type,
            createdAt: chatMessage.createdAt,
        };
    }
    /**
     * Get recent chat messages for a stream
     */
    async getChatMessages(streamId, limit = 50, before) {
        const query = { streamId, isDeleted: false };
        if (before) {
            query.createdAt = { $lt: before };
        }
        return LiveChat_js_1.LiveChatMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    /**
     * Delete chat message
     */
    async deleteChatMessage(messageId, userId, isAdmin = false) {
        const query = { messageId };
        if (!isAdmin) {
            query.userId = userId;
        }
        const result = await LiveChat_js_1.LiveChatMessage.updateOne(query, { $set: { isDeleted: true } });
        if (result.modifiedCount === 0) {
            throw new Error('Message not found or unauthorized');
        }
    }
    /**
     * Pin chat message
     */
    async pinChatMessage(streamId, messageId) {
        // Unpin existing pinned messages
        await LiveChat_js_1.LiveChatMessage.updateMany({ streamId, isPinned: true }, { $set: { isPinned: false } });
        // Pin the new message
        await LiveChat_js_1.LiveChatMessage.updateOne({ messageId, streamId }, { $set: { isPinned: true, type: 'pinned' } });
    }
    /**
     * Send system message
     */
    async sendSystemMessage(streamId, message) {
        const chatMessage = await LiveChat_js_1.LiveChatMessage.create({
            messageId: (0, uuid_1.v4)(),
            streamId,
            userId: 'system',
            username: 'System',
            message,
            type: 'system',
        });
        return {
            messageId: chatMessage.messageId,
            streamId: chatMessage.streamId,
            userId: chatMessage.userId,
            username: chatMessage.username,
            avatar: chatMessage.avatar,
            message: chatMessage.message,
            type: chatMessage.type,
            createdAt: chatMessage.createdAt,
        };
    }
    /**
     * Delete stream and associated data
     */
    async deleteStream(userId, streamId) {
        const stream = await LiveStream_js_1.LiveStream.findOne({ streamId, userId });
        if (!stream) {
            throw new Error('Stream not found');
        }
        if (stream.status === 'live') {
            throw new Error('Cannot delete a live stream');
        }
        // Delete chat messages
        await LiveChat_js_1.LiveChatMessage.deleteMany({ streamId });
        // Delete stream
        await LiveStream_js_1.LiveStream.deleteOne({ streamId });
    }
}
exports.LiveStreamService = LiveStreamService;
//# sourceMappingURL=live.service.js.map