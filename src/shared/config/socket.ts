import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

let io: Server | null = null;

export interface VideoRoomData {
  videoId: string;
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

      pubClient.on('error', (err) => console.error('[Socket.io] Redis pub error:', err.message));
      subClient.on('error', (err) => console.error('[Socket.io] Redis sub error:', err.message));

      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.io] Redis adapter connected');
    } catch (error) {
      console.warn('[Socket.io] Failed to connect Redis adapter, running without clustering:', error);
    }
  }

  // Handle connections
  io.on('connection', (socket: Socket) => {

    // Join a video room (for real-time comments)
    socket.on('join:video', (data: VideoRoomData) => {
      const videoId = typeof data?.videoId === 'string' ? data.videoId.slice(0, 128) : null;
      if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return;
      socket.join(`video:${videoId}`);
    });

    // Leave a video room
    socket.on('leave:video', (data: VideoRoomData) => {
      const videoId = typeof data?.videoId === 'string' ? data.videoId.slice(0, 128) : null;
      if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return;
      socket.leave(`video:${videoId}`);
    });

    socket.on('disconnect', () => {});
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
