import { ILiveStream, LiveStreamStatus } from '../../../models/LiveStream.js';
import { ILiveChatMessage } from '../../../models/LiveChat.js';
import { CreateLiveStreamInput, UpdateLiveStreamInput } from '../../../schemas/live.js';
export interface CreateStreamResult {
    streamId: string;
    streamKey: string;
    rtmpUrl: string;
    rtmpFullUrl: string;
    playbackUrl: string;
    status: LiveStreamStatus;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    recordingEnabled: boolean;
    chatEnabled: boolean;
    createdAt: Date;
}
export interface StreamDetails {
    streamId: string;
    userId: string;
    title: string;
    description?: string;
    thumbnail?: string;
    category?: string;
    tags?: string[];
    status: LiveStreamStatus;
    viewerCount: number;
    startedAt?: Date;
    duration?: number;
    chatEnabled: boolean;
    playbackUrl?: string;
    streamer?: {
        username: string;
        displayName: string;
        avatar?: string;
        isVerified: boolean;
    };
}
export interface ChatMessageResult {
    messageId: string;
    streamId: string;
    userId: string;
    username: string;
    avatar?: string;
    message: string;
    type: string;
    createdAt: Date;
}
export declare class LiveStreamService {
    private readonly rtmpBaseUrl;
    constructor();
    /**
     * Generate a cryptographically secure stream key
     */
    private generateStreamKey;
    /**
     * Create a new live stream
     */
    createStream(userId: string, userType: 'user' | 'creator', data: CreateLiveStreamInput): Promise<CreateStreamResult>;
    /**
     * Get stream by ID
     */
    getStreamById(streamId: string, includeKey?: boolean): Promise<ILiveStream | null>;
    /**
     * Get stream by stream key (for RTMP ingest validation)
     */
    getStreamByKey(streamKey: string): Promise<ILiveStream | null>;
    /**
     * Get stream details with streamer profile
     */
    getStreamDetails(streamId: string, signUrls?: boolean): Promise<StreamDetails | null>;
    /**
     * Get stream key for owner
     */
    getStreamKey(userId: string, streamId: string): Promise<string>;
    /**
     * Regenerate stream key
     */
    regenerateStreamKey(userId: string, streamId: string): Promise<string>;
    /**
     * Mark stream as ready (called when RTMP connection established)
     */
    markStreamReady(streamKey: string): Promise<ILiveStream | null>;
    /**
     * Start stream (called when first frame received)
     */
    startStream(streamId: string, playbackR2Key?: string): Promise<ILiveStream | null>;
    /**
     * End stream
     */
    endStream(streamId: string, userId?: string): Promise<ILiveStream | null>;
    /**
     * Mark stream as failed
     */
    markStreamFailed(streamId: string, reason: string): Promise<ILiveStream | null>;
    /**
     * Update stream status with history
     */
    private updateStreamStatus;
    /**
     * Update stream metadata
     */
    updateStream(userId: string, streamId: string, data: UpdateLiveStreamInput): Promise<ILiveStream | null>;
    /**
     * Get active (live) streams
     */
    getActiveStreams(page?: number, limit?: number, category?: string): Promise<{
        streams: StreamDetails[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get creator's streams (history)
     */
    getCreatorStreams(userId: string, page?: number, limit?: number, status?: LiveStreamStatus): Promise<{
        streams: ILiveStream[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Update viewer count
     */
    updateViewerCount(streamId: string, count: number): Promise<void>;
    /**
     * Increment viewer count
     */
    incrementViewerCount(streamId: string): Promise<number>;
    /**
     * Decrement viewer count
     */
    decrementViewerCount(streamId: string): Promise<number>;
    /**
     * Update stream thumbnail
     */
    updateThumbnail(streamId: string, thumbnailUrl: string): Promise<void>;
    /**
     * Link recorded video to stream
     */
    linkRecordedVideo(streamId: string, videoId: string): Promise<void>;
    /**
     * Get playback URL for a stream
     */
    private getPlaybackUrl;
    /**
     * Get signed playback URL for a live stream.
     */
    getSignedPlayback(streamId: string): Promise<{
        streamId: string;
        playbackUrl: string;
        signedUrl: string;
        expiresIn: number;
    } | null>;
    /**
     * Save chat message
     */
    saveChatMessage(streamId: string, userId: string, message: string): Promise<ChatMessageResult>;
    /**
     * Get recent chat messages for a stream
     */
    getChatMessages(streamId: string, limit?: number, before?: Date): Promise<ILiveChatMessage[]>;
    /**
     * Delete chat message
     */
    deleteChatMessage(messageId: string, userId: string, isAdmin?: boolean): Promise<void>;
    /**
     * Pin chat message
     */
    pinChatMessage(streamId: string, messageId: string): Promise<void>;
    /**
     * Send system message
     */
    sendSystemMessage(streamId: string, message: string): Promise<ChatMessageResult>;
    /**
     * Delete stream and associated data
     */
    deleteStream(userId: string, streamId: string): Promise<void>;
}
//# sourceMappingURL=live.service.d.ts.map