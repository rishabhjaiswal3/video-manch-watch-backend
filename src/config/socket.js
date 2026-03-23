import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

let io = null;

export const initializeSocket = (httpServer, corsOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const isTls = redisUrl.startsWith('rediss://');
      const redisOptions = isTls ? { tls: { rejectUnauthorized: false } } : {};
      const pubClient = new Redis(redisUrl, redisOptions);
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error('[Socket] Redis pub error:', err.message));
      subClient.on('error', (err) => console.error('[Socket] Redis sub error:', err.message));
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket] Redis adapter connected');
    } catch (err) {
      console.warn('[Socket] Redis adapter failed, running without clustering:', err);
    }
  }

  io.on('connection', (socket) => {
    socket.on('join:video', (data) => {
      const videoId = typeof data?.videoId === 'string' ? data.videoId.slice(0, 128) : null;
      if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return;
      socket.join(`video:${videoId}`);
    });

    socket.on('leave:video', (data) => {
      const videoId = typeof data?.videoId === 'string' ? data.videoId.slice(0, 128) : null;
      if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return;
      socket.leave(`video:${videoId}`);
    });

    socket.on('disconnect', () => {});
  });

  console.log('[Socket] Server initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToVideoRoom = (videoId, event, data) => {
  if (io) io.to(`video:${videoId}`).emit(event, data);
};

export const emitNewComment = (videoId, comment) => emitToVideoRoom(videoId, 'comment:new', comment);
export const emitDeleteComment = (videoId, data) => emitToVideoRoom(videoId, 'comment:delete', data);
export const emitUpdateComment = (videoId, comment) => emitToVideoRoom(videoId, 'comment:update', comment);
export const emitEngagementUpdate = (videoId, data) => emitToVideoRoom(videoId, 'engagement:update', data);
