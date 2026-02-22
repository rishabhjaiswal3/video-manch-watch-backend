"use strict";
/**
 * VideoManch API Server
 *
 * Architecture: Modular Monolith with 5 Domains
 *
 *   ┌────────────────────────────────────────────────────────────────────────────┐
 *   │                           API SERVER (this file)                           │
 *   ├─────────────┬────────────┬───────────────┬─────────────────┬──────────────┤
 *   │   AUTH      │   MEDIA    │  ANALYTICS    │     ADMIN       │    SOCIAL    │
 *   │             │            │               │                 │              │
 *   │  /auth/*    │  /upload/* │  /analytics/* │  /admin/*       │  /profile/*  │
 *   │             │  /videos/* │  /playback/*  │  /config/*      │  /engage/*   │
 *   │             │            │               │                 │  /subs/*     │
 *   │  signup     │  init      │  overview     │  users          │  /comments/* │
 *   │  login      │  complete  │  videos       │  roles          │              │
 *   │  logout     │  status    │  trends       │  stats          │  profiles    │
 *   │  refresh    │  stream    │  events       │  player config  │  likes       │
 *   │             │            │               │                 │  subscribe   │
 *   │             │            │               │                 │  comments    │
 *   └─────────────┴────────────┴───────────────┴─────────────────┴──────────────┘
 *
 *   The Analytics Worker runs as a SEPARATE process (src/worker.ts)
 *   to isolate event processing from the API serving path.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const database_js_1 = require("./config/database.js");
const redis_js_1 = require("./config/redis.js");
const env_js_1 = require("./config/env.js");
const socket_js_1 = require("./config/socket.js");
// Domain route imports
const routes_js_1 = __importDefault(require("./domains/auth/routes.js"));
const upload_routes_js_1 = __importDefault(require("./domains/media/upload.routes.js"));
const videos_routes_js_1 = __importDefault(require("./domains/media/videos.routes.js"));
const playback_routes_js_1 = __importDefault(require("./domains/analytics/playback.routes.js"));
const creator_routes_js_1 = __importDefault(require("./domains/analytics/creator.routes.js"));
const admin_routes_js_1 = __importDefault(require("./domains/admin/admin.routes.js"));
const config_routes_js_1 = __importDefault(require("./domains/admin/config.routes.js"));
// Social domain routes
const profile_routes_js_1 = __importDefault(require("./domains/social/profile.routes.js"));
const engagement_routes_js_1 = __importDefault(require("./domains/social/engagement.routes.js"));
const subscription_routes_js_1 = __importDefault(require("./domains/social/subscription.routes.js"));
const comment_routes_js_1 = __importDefault(require("./domains/social/comment.routes.js"));
// Live streaming routes
const live_routes_js_1 = __importDefault(require("./domains/live/live.routes.js"));
// Shared middleware
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
// Validate environment variables first (exits if invalid)
const env = (0, env_js_1.loadEnvironment)();
const app = (0, express_1.default)();
const PORT = env.PORT;
// Required when running behind proxies so rate limiting can safely read client IP.
// Use a hop count (not boolean true) to avoid ERR_ERL_PERMISSIVE_TRUST_PROXY.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || '1');
if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
}
// Track server state
let isShuttingDown = false;
let server;
// ─── Health Check (before any middleware) ───────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'videomanch-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// ─── Middleware ─────────────────────────────────────────
// CORS — allow multiple origins (comma-separated in FRONTEND_URL env var)
const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter_js_1.apiLimiter);
// Request logging in development
if (env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}
// Shutdown check — reject new requests during shutdown
app.use((req, res, next) => {
    if (isShuttingDown) {
        res.status(503).json({
            success: false,
            error: 'Server is shutting down. Please try again later.',
        });
        return;
    }
    next();
});
// ─── Domain Routes ─────────────────────────────────────
//
// Path mapping (same paths as before — zero breaking changes):
//
//   AUTH domain:
app.use('/auth', routes_js_1.default);
//
//   MEDIA domain (upload + video catalog + streaming):
app.use('/upload', upload_routes_js_1.default);
app.use('/videos', videos_routes_js_1.default);
//
//   ANALYTICS domain (playback events + creator analytics):
app.use('/playback', playback_routes_js_1.default);
app.use('/analytics', creator_routes_js_1.default);
//
//   ADMIN domain (user management + platform config):
app.use('/admin', admin_routes_js_1.default);
app.use('/config', config_routes_js_1.default);
//
//   SOCIAL domain (profiles, engagement, subscriptions, comments):
app.use('/profile', profile_routes_js_1.default);
app.use('/engagement', engagement_routes_js_1.default);
app.use('/subscriptions', subscription_routes_js_1.default);
app.use('/comments', comment_routes_js_1.default);
//
//   LIVE domain (live streaming):
app.use('/live', live_routes_js_1.default);
// ─── Error Handling ────────────────────────────────────
// 404 handler
app.use(errorHandler_js_1.notFoundHandler);
// Global error handler (must be last)
app.use(errorHandler_js_1.globalErrorHandler);
// ─── Graceful Shutdown ─────────────────────────────────
const gracefulShutdown = async (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
    isShuttingDown = true;
    // Stop accepting new connections
    server.close(async () => {
        console.log('[SHUTDOWN] HTTP server closed');
        try {
            // Close database connections
            console.log('[SHUTDOWN] Closing database connections...');
            await Promise.allSettled([
                (0, database_js_1.disconnectDatabase)(),
                (0, redis_js_1.disconnectRedis)(),
            ]);
            console.log('[SHUTDOWN] All connections closed. Exiting...');
            process.exit(0);
        }
        catch (error) {
            console.error('[SHUTDOWN] Error during shutdown:', error);
            process.exit(1);
        }
    });
    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};
// ─── Error & Signal Handlers ───────────────────────────
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// ─── Start Server ──────────────────────────────────────
const startServer = async () => {
    try {
        // Connect to MongoDB
        await (0, database_js_1.connectDatabase)();
        // Create HTTP server (needed for Socket.io)
        server = http_1.default.createServer(app);
        // Initialize Socket.io with Redis adapter for scaling
        (0, socket_js_1.initializeSocket)(server, allowedOrigins);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n${'='.repeat(56)}`);
            console.log(`  VideoManch API Server`);
            console.log(`${'─'.repeat(56)}`);
            console.log(`  Port:        ${PORT}`);
            console.log(`  Environment: ${env.NODE_ENV}`);
            console.log(`  Health:      http://localhost:${PORT}/health`);
            console.log(`  WebSocket:   ws://localhost:${PORT}`);
            console.log(`${'─'.repeat(56)}`);
            console.log(`  Domains:`);
            console.log(`    AUTH      → /auth/*`);
            console.log(`    MEDIA     → /upload/*, /videos/*`);
            console.log(`    ANALYTICS → /playback/*, /analytics/*`);
            console.log(`    ADMIN     → /admin/*, /config/*`);
            console.log(`    SOCIAL    → /profile/*, /engagement/*, /subscriptions/*, /comments/*`);
            console.log(`    LIVE      → /live/*`);
            console.log(`${'─'.repeat(56)}`);
            console.log(`  ⚠️  Analytics Worker runs separately: npm run worker:dev`);
            console.log(`${'='.repeat(56)}\n`);
        });
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`[FATAL] Port ${PORT} is already in use`);
                process.exit(1);
            }
            throw error;
        });
    }
    catch (error) {
        console.error('[FATAL] Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map