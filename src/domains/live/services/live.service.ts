import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LiveStream, ILiveStream, LiveStreamStatus } from '../../../models/LiveStream.js';
import { LiveChatMessage, ILiveChatMessage } from '../../../models/LiveChat.js';
import { Profile } from '../../../models/Profile.js';
import { CreateLiveStreamInput, UpdateLiveStreamInput } from '../../../schemas/live.js';
import { generateSignedUrl } from '../../../utils/signedUrl.js';

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

export class LiveStreamService {
  private readonly rtmpBaseUrl: string;

  constructor() {
    this.rtmpBaseUrl = process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live';
  }

  /**
   * Generate a cryptographically secure stream key
   */
  private generateStreamKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new live stream
   */
  async createStream(
    userId: string,
    userType: 'user' | 'creator',
    data: CreateLiveStreamInput
  ): Promise<CreateStreamResult> {
    const streamId = uuidv4();
    const streamKey = this.generateStreamKey();

    const stream = await LiveStream.create({
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
        from: 'created' as LiveStreamStatus,
        to: 'created' as LiveStreamStatus,
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
  async getStreamById(streamId: string, includeKey: boolean = false): Promise<ILiveStream | null> {
    const selectFields = includeKey ? '' : '-streamKey';
    return LiveStream.findOne({ streamId }).select(selectFields);
  }

  /**
   * Get stream by stream key (for RTMP ingest validation)
   */
  async getStreamByKey(streamKey: string): Promise<ILiveStream | null> {
    // Allow live status as well so browser/encoder reconnects are not rejected mid-stream.
    return LiveStream.findOne({ streamKey, status: { $in: ['created', 'ready', 'live'] } });
  }

  /**
   * Get stream details with streamer profile
   */
  async getStreamDetails(streamId: string, signUrls: boolean = true): Promise<StreamDetails | null> {
    const stream = await LiveStream.findOne({ streamId }).select('-streamKey');
    if (!stream) return null;

    const profile = await Profile.findOne({ userId: stream.userId });

    let playbackUrl = stream.playbackUrl;
    if (signUrls && stream.status === 'live' && stream.playbackR2Key) {
      // Generate signed URL for playback
      const expiresIn = 3600; // 1 hour
      playbackUrl = generateSignedUrl({
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
  async getStreamKey(userId: string, streamId: string): Promise<string> {
    const stream = await LiveStream.findOne({ streamId, userId });
    if (!stream) {
      throw new Error('Stream not found');
    }
    return stream.streamKey;
  }

  /**
   * Regenerate stream key
   */
  async regenerateStreamKey(userId: string, streamId: string): Promise<string> {
    const stream = await LiveStream.findOne({ streamId, userId });
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
  async markStreamReady(streamKey: string): Promise<ILiveStream | null> {
    const stream = await LiveStream.findOne({ streamKey });
    if (!stream || stream.status !== 'created') return null;

    return this.updateStreamStatus(stream, 'ready', 'RTMP connection established');
  }

  /**
   * Start stream (called when first frame received)
   */
  async startStream(streamId: string, playbackR2Key?: string): Promise<ILiveStream | null> {
    const stream = await LiveStream.findOne({ streamId });
    if (!stream || !['created', 'ready'].includes(stream.status)) return null;

    stream.startedAt = new Date();
    if (playbackR2Key) {
      stream.playbackR2Key = playbackR2Key;
      const baseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
      stream.playbackUrl = baseUrl
        ? `${baseUrl}/${playbackR2Key}`
        : this.getPlaybackUrl(streamId);
    }

    return this.updateStreamStatus(stream, 'live', 'Stream started');
  }

  /**
   * End stream
   */
  async endStream(streamId: string, userId?: string): Promise<ILiveStream | null> {
    const query: any = { streamId };
    if (userId) {
      query.userId = userId;
    }

    const stream = await LiveStream.findOne(query);
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
  async markStreamFailed(streamId: string, reason: string): Promise<ILiveStream | null> {
    const stream = await LiveStream.findOne({ streamId });
    if (!stream) return null;

    stream.endedAt = new Date();
    return this.updateStreamStatus(stream, 'failed', reason);
  }

  /**
   * Update stream status with history
   */
  private async updateStreamStatus(
    stream: ILiveStream,
    newStatus: LiveStreamStatus,
    reason: string
  ): Promise<ILiveStream> {
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
  async updateStream(
    userId: string,
    streamId: string,
    data: UpdateLiveStreamInput
  ): Promise<ILiveStream | null> {
    const stream = await LiveStream.findOne({ streamId, userId });
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (data.title) stream.title = data.title;
    if (data.description !== undefined) stream.description = data.description;
    if (data.category !== undefined) stream.category = data.category;
    if (data.tags !== undefined) stream.tags = data.tags;
    if (data.chatEnabled !== undefined) stream.chatEnabled = data.chatEnabled;
    if (data.isAdultContent !== undefined) stream.isAdultContent = data.isAdultContent;

    await stream.save();
    return stream;
  }

  /**
   * Get active (live) streams
   */
  async getActiveStreams(
    page: number = 1,
    limit: number = 20,
    category?: string
  ): Promise<{ streams: StreamDetails[]; total: number; page: number; totalPages: number }> {
    const query: any = { status: 'live' };
    if (category) {
      query.category = category;
    }

    const [streams, total] = await Promise.all([
      LiveStream.find(query)
        .select('-streamKey')
        .sort({ viewerCount: -1, startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LiveStream.countDocuments(query),
    ]);

    // Get streamer profiles
    const userIds = [...new Set(streams.map((s) => s.userId))];
    const profiles = await Profile.find({ userId: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const streamDetails: StreamDetails[] = streams.map((stream) => {
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
  async getCreatorStreams(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: LiveStreamStatus
  ): Promise<{ streams: ILiveStream[]; total: number; page: number; totalPages: number }> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const [streams, total] = await Promise.all([
      LiveStream.find(query)
        .select('-streamKey')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LiveStream.countDocuments(query),
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
  async updateViewerCount(streamId: string, count: number): Promise<void> {
    await LiveStream.updateOne(
      { streamId },
      {
        $set: { viewerCount: count },
        $max: { peakViewers: count },
        $inc: { totalViews: count > 0 ? 1 : 0 },
      }
    );
  }

  /**
   * Increment viewer count
   */
  async incrementViewerCount(streamId: string): Promise<number> {
    const stream = await LiveStream.findOneAndUpdate(
      { streamId },
      {
        $inc: { viewerCount: 1, totalViews: 1 },
      },
      { new: true }
    );

    if (stream && stream.viewerCount > stream.peakViewers) {
      await LiveStream.updateOne(
        { streamId },
        { $set: { peakViewers: stream.viewerCount } }
      );
    }

    return stream?.viewerCount || 0;
  }

  /**
   * Decrement viewer count
   */
  async decrementViewerCount(streamId: string): Promise<number> {
    const stream = await LiveStream.findOneAndUpdate(
      { streamId, viewerCount: { $gt: 0 } },
      { $inc: { viewerCount: -1 } },
      { new: true }
    );
    return stream?.viewerCount || 0;
  }

  /**
   * Update stream thumbnail
   */
  async updateThumbnail(streamId: string, thumbnailUrl: string): Promise<void> {
    await LiveStream.updateOne({ streamId }, { $set: { thumbnail: thumbnailUrl } });
  }

  /**
   * Link recorded video to stream
   */
  async linkRecordedVideo(streamId: string, videoId: string): Promise<void> {
    await LiveStream.updateOne({ streamId }, { $set: { recordedVideoId: videoId } });
  }

  /**
   * Get playback URL for a stream
   */
  private getPlaybackUrl(streamId: string): string {
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    return `${baseUrl}/live/${streamId}/master.m3u8`;
  }

  /**
   * Get signed playback URL for a live stream.
   */
  async getSignedPlayback(streamId: string): Promise<{
    streamId: string;
    playbackUrl: string;
    signedUrl: string;
    expiresIn: number;
  } | null> {
    const stream = await LiveStream.findOne({ streamId }).select('-streamKey');
    if (!stream || !stream.playbackR2Key) return null;

    const expiresIn = 3600; // 1 hour
    const { signedPath } = generateSignedUrl({
      videoId: streamId,
      path: stream.playbackR2Key,
      expiresIn,
    });

    return {
      streamId: stream.streamId,
      playbackUrl: stream.playbackUrl || this.getPlaybackUrl(streamId),
      signedUrl: signedPath,
      expiresIn,
    };
  }

  // ========================
  // Chat Methods
  // ========================

  /**
   * Save chat message
   */
  async saveChatMessage(
    streamId: string,
    userId: string,
    message: string
  ): Promise<ChatMessageResult> {
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    const chatMessage = await LiveChatMessage.create({
      messageId: uuidv4(),
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
  async getChatMessages(
    streamId: string,
    limit: number = 50,
    before?: Date
  ): Promise<ILiveChatMessage[]> {
    const query: any = { streamId, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: before };
    }

    return LiveChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Delete chat message
   */
  async deleteChatMessage(messageId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const query: any = { messageId };
    if (!isAdmin) {
      query.userId = userId;
    }

    const result = await LiveChatMessage.updateOne(query, { $set: { isDeleted: true } });
    if (result.modifiedCount === 0) {
      throw new Error('Message not found or unauthorized');
    }
  }

  /**
   * Pin chat message
   */
  async pinChatMessage(streamId: string, messageId: string): Promise<void> {
    // Unpin existing pinned messages
    await LiveChatMessage.updateMany(
      { streamId, isPinned: true },
      { $set: { isPinned: false } }
    );

    // Pin the new message
    await LiveChatMessage.updateOne(
      { messageId, streamId },
      { $set: { isPinned: true, type: 'pinned' } }
    );
  }

  /**
   * Send system message
   */
  async sendSystemMessage(streamId: string, message: string): Promise<ChatMessageResult> {
    const chatMessage = await LiveChatMessage.create({
      messageId: uuidv4(),
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
  async deleteStream(userId: string, streamId: string): Promise<void> {
    const stream = await LiveStream.findOne({ streamId, userId });
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status === 'live') {
      throw new Error('Cannot delete a live stream');
    }

    // Delete chat messages
    await LiveChatMessage.deleteMany({ streamId });

    // Delete stream
    await LiveStream.deleteOne({ streamId });
  }
}
