import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

let io: Server | null = null;

export interface VideoRoomData {
  videoId: string;
  userId?: string;
}

export interface LiveRoomData {
  streamId: string;
  userId?: string;
}

export const initializeSocket = (httpServer: HttpServer, corsOrigins: string[]): Server => {
  const redisUrl = process.env.REDIS_URL;

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Set up Redis adapter for horizontal scaling (if Redis is available)
  if (redisUrl) {
    try {
      const isTls = redisUrl.startsWith('rediss://');
      const redisOptions = isTls ? { tls: { rejectUnauthorized: false } } : {};

      const pubClient = new Redis(redisUrl, redisOptions);
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.io] Redis adapter connected');
    } catch (error) {
      console.warn('[Socket.io] Failed to connect Redis adapter, running without clustering:', error);
    }
  }

  // Handle connections
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a video room (for real-time comments)
    socket.on('join:video', (data: VideoRoomData) => {
      const room = `video:${data.videoId}`;
      socket.join(room);
      console.log(`[Socket.io] ${socket.id} joined room: ${room}`);
    });

    // Leave a video room
    socket.on('leave:video', (data: VideoRoomData) => {
      const room = `video:${data.videoId}`;
      socket.leave(room);
      console.log(`[Socket.io] ${socket.id} left room: ${room}`);
    });

    // ========================
    // Live Stream Room Events
    // ========================

    // Join a live stream room
    socket.on('join:live', (data: LiveRoomData) => {
      const room = `live:${data.streamId}`;
      socket.join(room);
      console.log(`[Socket.io] ${socket.id} joined live room: ${room}`);

      // Emit viewer joined event to the room
      io?.to(room).emit('live:viewer-joined', {
        streamId: data.streamId,
        userId: data.userId
      });
    });

    // Leave a live stream room
    socket.on('leave:live', (data: LiveRoomData) => {
      const room = `live:${data.streamId}`;
      socket.leave(room);
      console.log(`[Socket.io] ${socket.id} left live room: ${room}`);

      // Emit viewer left event to the room
      io?.to(room).emit('live:viewer-left', {
        streamId: data.streamId,
        userId: data.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Helper functions for emitting events to video rooms
export const emitToVideoRoom = (videoId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`video:${videoId}`).emit(event, data);
  }
};

// Comment events
export const emitNewComment = (videoId: string, comment: unknown): void => {
  emitToVideoRoom(videoId, 'comment:new', comment);
};

export const emitDeleteComment = (
  videoId: string,
  data: { commentId: string; parentId?: string | null }
): void => {
  emitToVideoRoom(videoId, 'comment:delete', data);
};

export const emitUpdateComment = (videoId: string, comment: unknown): void => {
  emitToVideoRoom(videoId, 'comment:update', comment);
};

// Engagement events (optional - for real-time like counts)
export const emitEngagementUpdate = (videoId: string, data: { likeCount: number; dislikeCount: number }): void => {
  emitToVideoRoom(videoId, 'engagement:update', data);
};

// ========================
// Live Stream Events
// ========================

// Helper function for emitting events to live rooms
export const emitToLiveRoom = (streamId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`live:${streamId}`).emit(event, data);
  }
};

// Live stream started
export const emitLiveStarted = (streamId: string, data: { streamId: string; title: string; userId: string }): void => {
  emitToLiveRoom(streamId, 'live:started', data);
};

// Live stream ended
export const emitLiveEnded = (streamId: string): void => {
  emitToLiveRoom(streamId, 'live:ended', { streamId });
};

// Live viewer count update
export const emitLiveViewerCount = (streamId: string, count: number): void => {
  emitToLiveRoom(streamId, 'live:viewers', { streamId, count });
};

// Live chat message
export const emitLiveChatMessage = (streamId: string, message: unknown): void => {
  emitToLiveRoom(streamId, 'live:chat', message);
};

// Live chat message deleted
export const emitLiveChatDeleted = (streamId: string, messageId: string): void => {
  emitToLiveRoom(streamId, 'live:chat-deleted', { streamId, messageId });
};

// Live chat message pinned
export const emitLiveChatPinned = (streamId: string, message: unknown): void => {
  emitToLiveRoom(streamId, 'live:chat-pinned', message);
};

// Live stream status update
export const emitLiveStatusUpdate = (streamId: string, status: string): void => {
  emitToLiveRoom(streamId, 'live:status', { streamId, status });
};
