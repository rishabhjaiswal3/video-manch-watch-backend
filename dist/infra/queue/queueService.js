"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = exports.getQueues = void 0;
const bullmq_1 = require("bullmq");
const redis_js_1 = require("../../shared/config/redis.js");
let userQueue = null;
let creatorQueue = null;
const getQueues = () => {
    const connection = (0, redis_js_1.getRedisConnection)();
    if (!userQueue) {
        userQueue = new bullmq_1.Queue('user-transcode-queue', {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                // Remove jobs from Redis immediately - status is tracked in MongoDB
                removeOnComplete: true,
                removeOnFail: true,
            },
        });
    }
    if (!creatorQueue) {
        creatorQueue = new bullmq_1.Queue('creator-transcode-queue', {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 10000,
                },
                // Remove jobs from Redis immediately - status is tracked in MongoDB
                removeOnComplete: true,
                removeOnFail: true,
            },
        });
    }
    return { userQueue, creatorQueue };
};
exports.getQueues = getQueues;
exports.queueService = {
    /**
     * Add a transcoding job to the appropriate queue
     */
    async addTranscodeJob(data) {
        const { userQueue, creatorQueue } = (0, exports.getQueues)();
        const queue = data.userType === 'creator' ? creatorQueue : userQueue;
        console.log(`[QUEUE] 📥 Adding transcode job for video: ${data.videoId}`);
        console.log(`[QUEUE] 👤 User: ${data.userId}, Type: ${data.userType}`);
        console.log(`[QUEUE] 🎯 Qualities: ${data.qualities.join(', ')}`);
        const job = await queue.add('transcode-video', data, {
            priority: data.userType === 'creator' ? 5 : 1,
            jobId: data.videoId,
        });
        console.log(`[QUEUE] ✅ Job ${job.id} added to ${data.userType}-transcode-queue with priority ${data.userType === 'creator' ? 5 : 1}`);
        return job.id || data.videoId;
    },
    /**
     * Get job status
     */
    async getJobStatus(videoId, userType = 'user') {
        const { userQueue, creatorQueue } = (0, exports.getQueues)();
        const queue = userType === 'creator' ? creatorQueue : userQueue;
        const job = await queue.getJob(videoId);
        if (!job) {
            return null;
        }
        const state = await job.getState();
        const progress = job.progress;
        return {
            id: job.id,
            state,
            progress,
            data: job.data,
            failedReason: job.failedReason,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
        };
    },
    /**
     * Get queue stats
     */
    async getQueueStats(userType = 'user') {
        const { userQueue, creatorQueue } = (0, exports.getQueues)();
        const queue = userType === 'creator' ? creatorQueue : userQueue;
        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
        ]);
        return { waiting, active, completed, failed };
    },
};
//# sourceMappingURL=queueService.js.map