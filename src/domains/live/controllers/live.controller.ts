import { Request, Response } from 'express';
import { LiveStreamService } from '../services/live.service.js';
import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import {
  emitLiveViewerCount,
  emitLiveEnded,
  emitLiveChatMessage,
  emitLiveStarted,
} from '../../../config/socket.js';

const liveStreamService = new LiveStreamService();

export class LiveController {
  /**
   * Create a new live stream
   */
  async createStream(req: Request, res: Response) {
    try {
      const { userId, userType } = ensureAuthenticatedUser(req);

      // Any authenticated user can create live streams
      const result = await liveStreamService.createStream(
        userId,
        userType as 'user' | 'creator',
        req.body
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async getActiveStreams(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string | undefined;

      const result = await liveStreamService.getActiveStreams(page, limit, category);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async getStreamDetails(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async getStreamKey(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { streamId } = req.params;

      const streamKey = await liveStreamService.getStreamKey(userId, streamId);

      return res.status(200).json({
        success: true,
        data: {
          streamKey,
          rtmpUrl: process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live',
        },
      });
    } catch (error: any) {
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
  async regenerateStreamKey(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { streamId } = req.params;

      const streamKey = await liveStreamService.regenerateStreamKey(userId, streamId);

      return res.status(200).json({
        success: true,
        data: {
          streamKey,
          rtmpUrl: process.env.RTMP_INGEST_URL || 'rtmp://localhost:1935/live',
        },
      });
    } catch (error: any) {
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
  async updateStream(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { streamId } = req.params;

      const stream = await liveStreamService.updateStream(userId, streamId, req.body);

      return res.status(200).json({
        success: true,
        data: stream,
      });
    } catch (error: any) {
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
  async startStream(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const { playbackR2Key } = req.body;

      // Verify internal secret for webhook calls
      const internalSecret = req.headers['x-internal-secret'];
      if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
        // If no internal secret, require auth and ownership
        const { userId } = ensureAuthenticatedUser(req);
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
      emitLiveStarted(streamId, {
        streamId: stream.streamId,
        title: stream.title,
        userId: stream.userId,
      });

      return res.status(200).json({
        success: true,
        data: { streamId: stream.streamId, status: stream.status },
      });
    } catch (error: any) {
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
  async endStream(req: Request, res: Response) {
    try {
      const { streamId } = req.params;

      // Check for internal webhook or authenticated user
      const internalSecret = req.headers['x-internal-secret'];
      let userId: string | undefined;

      if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
        const user = ensureAuthenticatedUser(req);
        userId = user.userId;
      }

      const stream = await liveStreamService.endStream(streamId, userId);

      // Emit real-time event
      emitLiveEnded(streamId);

      return res.status(200).json({
        success: true,
        data: {
          streamId: stream?.streamId,
          status: stream?.status,
          duration: stream?.duration,
        },
      });
    } catch (error: any) {
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
  async getMyStreams(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await liveStreamService.getCreatorStreams(
        userId,
        page,
        limit,
        status as any
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
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
  async deleteStream(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
      const { streamId } = req.params;

      await liveStreamService.deleteStream(userId, streamId);

      return res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
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
  async validateStreamKey(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async updateViewerCount(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const { count } = req.body;

      await liveStreamService.updateViewerCount(streamId, count);

      // Emit real-time update
      emitLiveViewerCount(streamId, count);

      return res.status(200).json({
        success: true,
      });
    } catch (error: any) {
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
  async getPlaybackUrl(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async linkVod(req: Request, res: Response) {
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
    } catch (error: any) {
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
  async getChatMessages(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? new Date(req.query.before as string) : undefined;

      const messages = await liveStreamService.getChatMessages(streamId, limit, before);

      return res.status(200).json({
        success: true,
        data: { messages },
      });
    } catch (error: any) {
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
  async sendChatMessage(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
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
      emitLiveChatMessage(streamId, chatMessage);

      return res.status(201).json({
        success: true,
        data: chatMessage,
      });
    } catch (error: any) {
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
  async deleteChatMessage(req: Request, res: Response) {
    try {
      const { userId, userType } = ensureAuthenticatedUser(req);
      const { streamId, messageId } = req.params;

      const isAdmin = userType === 'admin';
      await liveStreamService.deleteChatMessage(messageId, userId, isAdmin);

      return res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
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
  async pinChatMessage(req: Request, res: Response) {
    try {
      const { userId } = ensureAuthenticatedUser(req);
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
    } catch (error: any) {
      console.error('[LIVE] Pin chat message error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to pin message',
      });
    }
  }
}
