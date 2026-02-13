/**
 * VideoManch Analytics Worker — Standalone Process
 *
 * This runs as a SEPARATE process from the API server.
 * It drains analytics events from Redis and persists them to MongoDB.
 *
 * Why separate?
 *   - If the worker crashes → API still serves videos
 *   - If the API crashes → worker still drains events
 *   - Events are stored in Redis, so no data loss either way
 *
 * Start:
 *   npm run worker         (production — compiled JS)
 *   npm run worker:dev     (development — tsx watch)
 */

import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { loadEnvironment } from './config/env.js';
import { startAnalyticsWorker, stopAnalyticsWorker } from './services/analyticsWorker.js';

const env = loadEnvironment();

// Track state
let isShuttingDown = false;

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[WORKER-SHUTDOWN] Received ${signal}. Draining remaining events...`);

    try {
        // Stop worker (performs final drain: Redis → MongoDB)
        await stopAnalyticsWorker();
        console.log('[WORKER-SHUTDOWN] ✅ Final drain complete');

        // Close database connections
        await Promise.allSettled([
            disconnectDatabase(),
            disconnectRedis(),
        ]);

        console.log('[WORKER-SHUTDOWN] ✅ All connections closed. Exiting...');
        process.exit(0);
    } catch (error) {
        console.error('[WORKER-SHUTDOWN] ❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle fatal errors
process.on('uncaughtException', (error) => {
    console.error('[WORKER-FATAL] Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[WORKER-FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start
const startWorker = async () => {
    try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`VideoManch Analytics Worker`);
        console.log(`Environment: ${env.NODE_ENV}`);
        console.log(`${'='.repeat(50)}\n`);

        // Connect to MongoDB (required for writing aggregated data)
        await connectDatabase();

        // Start the worker loop (drains Redis → processes → writes to MongoDB)
        startAnalyticsWorker();

        console.log('[WORKER] ✅ Analytics worker running');
        console.log('[WORKER] Press Ctrl+C to stop\n');
    } catch (error) {
        console.error('[WORKER-FATAL] Failed to start worker:', error);
        process.exit(1);
    }
};

startWorker();
