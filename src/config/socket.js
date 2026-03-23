import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

let io = null;
let pubClient = null;
let subClient = null;

export const initializeSocket = (httpServer, corsOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const isTls = redisUrl.startsWith('rediss://');
      const redisOptions = {
        maxRetriesPerRequest: null,
        ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
      };
      pubClient = new Redis(redisUrl, redisOptions);
      subClient = pubClient.duplicate(redisOptions);
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

export const disconnectSocket = async () => {
  const tasks = [];

  if (io) {
    io.close();
    io = null;
    console.log('[Socket] Server closed');
  }

  if (subClient) {
    tasks.push(subClient.quit().catch(() => subClient.disconnect()));
    subClient = null;
  }

  if (pubClient) {
    tasks.push(pubClient.quit().catch(() => pubClient.disconnect()));
    pubClient = null;
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
    console.log('[Socket] Redis adapter connections closed');
  }
};

const emitToVideoRoom = (videoId, event, data) => {
  if (io) io.to(`video:${videoId}`).emit(event, data);
};

export const emitNewComment = (videoId, comment) => emitToVideoRoom(videoId, 'comment:new', comment);
export const emitDeleteComment = (videoId, data) => emitToVideoRoom(videoId, 'comment:delete', data);
export const emitUpdateComment = (videoId, comment) => emitToVideoRoom(videoId, 'comment:update', comment);
export const emitEngagementUpdate = (videoId, data) => emitToVideoRoom(videoId, 'engagement:update', data);
