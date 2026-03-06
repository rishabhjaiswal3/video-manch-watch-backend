import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { getRedisConnection } from '../../shared/config/redis.js';

export interface TranscodeJobData {
  videoId: string;
  userId: string;
  userType: 'user' | 'creator';
  r2Key: string;
  qualities: string[];
}

type TranscodeQueue = Queue<TranscodeJobData, unknown, string>;

let userQueue: TranscodeQueue | null = null;
let creatorQueue: TranscodeQueue | null = null;

export const getQueues = (): { userQueue: TranscodeQueue; creatorQueue: TranscodeQueue } => {
  const connection = getRedisConnection() as unknown as ConnectionOptions;

  if (!userQueue) {
    userQueue = new Queue<TranscodeJobData>('user-transcode-queue', {
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
    creatorQueue = new Queue<TranscodeJobData>('creator-transcode-queue', {
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

  return {
    userQueue,
    creatorQueue,
  };
};

export const queueService = {
  /**
   * Add a transcoding job to the appropriate queue
   */
  async addTranscodeJob(data: TranscodeJobData): Promise<string> {
    const { userQueue, creatorQueue } = getQueues();
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
  async getJobStatus(videoId: string, userType: 'user' | 'creator' = 'user') {
    const { userQueue, creatorQueue } = getQueues();
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
  async getQueueStats(userType: 'user' | 'creator' = 'user') {
    const { userQueue, creatorQueue } = getQueues();
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
