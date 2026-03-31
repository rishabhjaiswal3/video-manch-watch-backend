import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { ACCESS_COOKIE } from "../constants/auth/cookies.js";
import { parseCookies } from "../utils/cookies.js";

let io = null;
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,80}$/;
const normalizeVideoId = (value) => (typeof value === "string" ? value.trim() : "");
const isValidVideoId = (value) => VIDEO_ID_PATTERN.test(normalizeVideoId(value));
const buildEvent = (kind, payload = {}) => ({
  kind,
  eventVersion: Number(payload.eventVersion) || Date.now(),
  serverTs: Date.now(),
  ...payload,
});

export const initializeSocket = (httpServer, allowedOrigins = []) => {
  const origins = Array.isArray(allowedOrigins) && allowedOrigins.length > 0
    ? allowedOrigins
    : (process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie || "");
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
        cookies[ACCESS_COOKIE];

      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { userId: decoded.userId, role: decoded.role };
      return next();
    } catch {
      return next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }

    socket.on("join:video", ({ videoId }) => {
      const normalizedVideoId = normalizeVideoId(videoId);
      if (!isValidVideoId(normalizedVideoId)) return;
      socket.join(`video:${normalizedVideoId}`);
    });

    socket.on("leave:video", ({ videoId }) => {
      const normalizedVideoId = normalizeVideoId(videoId);
      if (!isValidVideoId(normalizedVideoId)) return;
      socket.leave(`video:${normalizedVideoId}`);
    });
  });

  console.log("[Socket] Server initialized");
  return io;
};

export const disconnectSocket = async () => {
  if (!io) return;
  await io.close();
  io = null;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const emitEngagementUpdate = (videoId, payload = {}) => {
  const normalizedVideoId = normalizeVideoId(videoId);
  if (!isValidVideoId(normalizedVideoId)) return;
  getIO().to(`video:${normalizedVideoId}`).emit("engagement:update", {
    videoId: normalizedVideoId,
    ...buildEvent("engagement:update", payload),
  });
};

export const emitCommentEvent = (videoId, type, payload = {}) => {
  const normalizedVideoId = normalizeVideoId(videoId);
  if (!isValidVideoId(normalizedVideoId)) return;
  const eventName =
    type === "new" ? "comment:new" : type === "update" ? "comment:update" : "comment:delete";
  getIO().to(`video:${normalizedVideoId}`).emit(eventName, {
    videoId: normalizedVideoId,
    ...buildEvent(eventName, payload),
  });
};

export const emitWatchLaterUpdate = (userId, payload = {}) => {
  if (!userId) return;
  getIO().to(`user:${userId}`).emit("watchLater:update", {
    userId,
    ...buildEvent("watchLater:update", payload),
  });
};

// Emits to all clients in the creator's user room so any page showing that creator updates live
export const emitSubscriptionUpdate = (creatorId, payload = {}) => {
  if (!creatorId) return;
  getIO().to(`user:${creatorId}`).emit("subscription:update", {
    creatorId,
    ...buildEvent("subscription:update", payload),
  });
};
