"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_js_1 = require("../shared/config/database.js");
const redis_js_1 = require("../shared/config/redis.js");
const env_js_1 = require("../shared/config/env.js");
const analyticsWorker_js_1 = require("./services/analyticsWorker.js");
(0, env_js_1.loadEnvironment)();
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`\n[WORKER] Received ${signal}. Starting graceful shutdown...`);
    try {
        await (0, analyticsWorker_js_1.stopAnalyticsWorker)();
        await Promise.allSettled([(0, database_js_1.disconnectDatabase)(), (0, redis_js_1.disconnectRedis)()]);
        console.log('[WORKER] Shutdown complete');
        process.exit(0);
    }
    catch (error) {
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
        await (0, database_js_1.connectDatabase)();
        await (0, analyticsWorker_js_1.startAnalyticsWorker)();
        console.log('[WORKER] Analytics worker started');
    }
    catch (error) {
        console.error('[WORKER] Failed to start:', error);
        process.exit(1);
    }
};
startWorker();
//# sourceMappingURL=analytics.worker.js.map