"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const database_js_1 = require("../shared/config/database.js");
const redis_js_1 = require("../shared/config/redis.js");
const env_js_1 = require("../shared/config/env.js");
const socket_js_1 = require("../shared/config/socket.js");
const server_js_1 = require("./server.js");
const env = (0, env_js_1.loadEnvironment)();
const PORT = env.PORT;
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || '1');
const allowedOrigins = env.FRONTEND_URL.split(',').map((url) => url.trim());
let isShuttingDown = false;
let server;
const app = (0, server_js_1.createServer)(allowedOrigins, env.NODE_ENV, trustProxyHops);
const gracefulShutdown = async (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
    isShuttingDown = true;
    server.close(async () => {
        console.log('[SHUTDOWN] HTTP server closed');
        try {
            console.log('[SHUTDOWN] Closing database connections...');
            await Promise.allSettled([(0, database_js_1.disconnectDatabase)(), (0, redis_js_1.disconnectRedis)()]);
            console.log('[SHUTDOWN] All connections closed. Exiting...');
            process.exit(0);
        }
        catch (error) {
            console.error('[SHUTDOWN] Error during shutdown:', error);
            process.exit(1);
        }
    });
    setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};
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
const startServer = async () => {
    try {
        await (0, database_js_1.connectDatabase)();
        server = http_1.default.createServer(app);
        (0, socket_js_1.initializeSocket)(server, allowedOrigins);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n${'='.repeat(56)}`);
            console.log('  VideoManch API Server');
            console.log(`${'─'.repeat(56)}`);
            console.log(`  Port:        ${PORT}`);
            console.log(`  Environment: ${env.NODE_ENV}`);
            console.log(`  Health:      http://localhost:${PORT}/health`);
            console.log(`  WebSocket:   ws://localhost:${PORT}`);
            console.log(`${'─'.repeat(56)}`);
            console.log('  Domains:');
            console.log('    AUTH      → /auth/*');
            console.log('    MEDIA     → /upload/*, /videos/*');
            console.log('    ANALYTICS → /playback/*, /analytics/*');
            console.log('    ADMIN     → /admin/*, /config/*');
            console.log('    SOCIAL    → /profile/*, /engagement/*, /subscriptions/*, /comments/*, /reports/*');
            console.log(`${'─'.repeat(56)}`);
            console.log('  ⚠️  Analytics Worker runs separately: npm run dev:worker');
            console.log(`${'='.repeat(56)}\n`);
        });
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
//# sourceMappingURL=start.js.map