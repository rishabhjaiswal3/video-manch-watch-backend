"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEngagementUpdate = exports.emitUpdateComment = exports.emitDeleteComment = exports.emitNewComment = exports.emitToVideoRoom = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
let io = null;
const initializeSocket = (httpServer, corsOrigins) => {
    const redisUrl = process.env.REDIS_URL;
    io = new socket_io_1.Server(httpServer, {
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
            const pubClient = new ioredis_1.default(redisUrl, redisOptions);
            const subClient = pubClient.duplicate();
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            console.log('[Socket.io] Redis adapter connected');
        }
        catch (error) {
            console.warn('[Socket.io] Failed to connect Redis adapter, running without clustering:', error);
        }
    }
    // Handle connections
    io.on('connection', (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);
        // Join a video room (for real-time comments)
        socket.on('join:video', (data) => {
            const room = `video:${data.videoId}`;
            socket.join(room);
            console.log(`[Socket.io] ${socket.id} joined room: ${room}`);
        });
        // Leave a video room
        socket.on('leave:video', (data) => {
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
exports.initializeSocket = initializeSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
};
exports.getIO = getIO;
// Helper functions for emitting events to video rooms
const emitToVideoRoom = (videoId, event, data) => {
    if (io) {
        io.to(`video:${videoId}`).emit(event, data);
    }
};
exports.emitToVideoRoom = emitToVideoRoom;
// Comment events
const emitNewComment = (videoId, comment) => {
    (0, exports.emitToVideoRoom)(videoId, 'comment:new', comment);
};
exports.emitNewComment = emitNewComment;
const emitDeleteComment = (videoId, data) => {
    (0, exports.emitToVideoRoom)(videoId, 'comment:delete', data);
};
exports.emitDeleteComment = emitDeleteComment;
const emitUpdateComment = (videoId, comment) => {
    (0, exports.emitToVideoRoom)(videoId, 'comment:update', comment);
};
exports.emitUpdateComment = emitUpdateComment;
// Engagement events (optional - for real-time like counts)
const emitEngagementUpdate = (videoId, data) => {
    (0, exports.emitToVideoRoom)(videoId, 'engagement:update', data);
};
exports.emitEngagementUpdate = emitEngagementUpdate;
//# sourceMappingURL=socket.js.map