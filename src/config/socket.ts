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
