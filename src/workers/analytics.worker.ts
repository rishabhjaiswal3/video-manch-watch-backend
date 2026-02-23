import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../shared/config/database.js';
import { disconnectRedis } from '../shared/config/redis.js';
import { loadEnvironment } from '../shared/config/env.js';
import { startAnalyticsWorker, stopAnalyticsWorker } from './services/analyticsWorker.js';

loadEnvironment();

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[WORKER] Received ${signal}. Starting graceful shutdown...`);

  try {
    await stopAnalyticsWorker();
    await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
    console.log('[WORKER] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('[WORKER] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WORKER] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

const startWorker = async () => {
  try {
    await connectDatabase();
    await startAnalyticsWorker();
    console.log('[WORKER] Analytics worker started');
  } catch (error) {
    console.error('[WORKER] Failed to start:', error);
    process.exit(1);
  }
};

startWorker();
