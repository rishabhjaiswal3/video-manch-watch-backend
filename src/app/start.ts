import 'dotenv/config';
import http from 'http';
import { connectDatabase, disconnectDatabase } from '../shared/config/database.js';
import { disconnectRedis } from '../shared/config/redis.js';
import { loadEnvironment } from '../shared/config/env.js';
import { initializeSocket } from '../shared/config/socket.js';
import { createServer } from './server.js';

const env = loadEnvironment();
const PORT = env.PORT;
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || '1');
const allowedOrigins = env.FRONTEND_URL.split(',').map((url) => url.trim());

let isShuttingDown = false;
let server: http.Server;

const app = createServer(allowedOrigins, env.NODE_ENV, trustProxyHops);

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
  isShuttingDown = true;

  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');

    try {
      console.log('[SHUTDOWN] Closing database connections...');
      await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
      console.log('[SHUTDOWN] All connections closed. Exiting...');
      process.exit(0);
    } catch (error) {
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
    await connectDatabase();

    server = http.createServer(app);
    initializeSocket(server, allowedOrigins);

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

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[FATAL] Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
