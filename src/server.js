import 'dotenv/config';
import http from 'http';
import { loadEnvironment } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { disconnectRedis } from './config/redis.js';
import { disconnectSocket, initializeSocket } from './config/socket.js';
import { createApp } from './app.js';

const env = loadEnvironment();
const PORT = env.PORT;
const allowedOrigins = env.FRONTEND_URL.split(',').map((url) => url.trim());

const app = createApp(allowedOrigins);
let server;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`\n[SHUTDOWN] ${signal} received. Shutting down...`);

  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');
    await Promise.allSettled([disconnectSocket(), disconnectDatabase(), disconnectRedis()]);
    console.log('[SHUTDOWN] All connections closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('uncaughtException', (err) => { console.error('[FATAL] Uncaught Exception:', err); gracefulShutdown('uncaughtException'); });
process.on('unhandledRejection', (reason) => { console.error('[FATAL] Unhandled Rejection:', reason); gracefulShutdown('unhandledRejection'); });
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

const start = async () => {
  try {
    await connectDatabase();

    server = http.createServer(app);
    initializeSocket(server, allowedOrigins);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log('  VideoManch API');
      console.log(`  Port: ${PORT}  |  ENV: ${env.NODE_ENV}`);
      console.log(`  Health: http://localhost:${PORT}/health`);
      console.log(`${'='.repeat(50)}\n`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  }
};

start();
