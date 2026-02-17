"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_js_1 = require("./config/database.js");
const redis_js_1 = require("./config/redis.js");
const env_js_1 = require("./config/env.js");
const analyticsWorker_js_1 = require("./services/analyticsWorker.js");
const env = (0, env_js_1.loadEnvironment)();
// Track state
let isShuttingDown = false;
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`\n[WORKER-SHUTDOWN] Received ${signal}. Draining remaining events...`);
    try {
        // Stop worker (performs final drain: Redis → MongoDB)
        await (0, analyticsWorker_js_1.stopAnalyticsWorker)();
        console.log('[WORKER-SHUTDOWN] ✅ Final drain complete');
        // Close database connections
        await Promise.allSettled([
            (0, database_js_1.disconnectDatabase)(),
            (0, redis_js_1.disconnectRedis)(),
        ]);
        console.log('[WORKER-SHUTDOWN] ✅ All connections closed. Exiting...');
        process.exit(0);
    }
    catch (error) {
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
        await (0, database_js_1.connectDatabase)();
        // Start the worker loop (drains Redis → processes → writes to MongoDB)
        (0, analyticsWorker_js_1.startAnalyticsWorker)();
        console.log('[WORKER] ✅ Analytics worker running');
        console.log('[WORKER] Press Ctrl+C to stop\n');
    }
    catch (error) {
        console.error('[WORKER-FATAL] Failed to start worker:', error);
        process.exit(1);
    }
};
startWorker();
//# sourceMappingURL=worker.js.map