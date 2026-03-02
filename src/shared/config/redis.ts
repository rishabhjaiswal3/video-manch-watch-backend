import Redis from 'ioredis';

const attachRedisErrorHandler = (client: Redis, label: string): void => {
  if (client.listenerCount('error') === 0) {
    client.on('error', (err: Error) => {
      console.error(`[Redis:${label}] Error:`, err.message);
    });
  }
};

let redisConnection: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in environment variables');
  }

  const isTls = redisUrl.startsWith('rediss://');

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(isTls && { tls: { rejectUnauthorized: false } }),
  });

  attachRedisErrorHandler(redisConnection, 'main');

  // Patch .duplicate() so BullMQ's internal clones also get error handlers.
  const originalDuplicate = redisConnection.duplicate.bind(redisConnection);
  (redisConnection as any).duplicate = (...args: unknown[]) => {
    const clone = (originalDuplicate as (...a: unknown[]) => Redis)(...args);
    attachRedisErrorHandler(clone, 'duplicate');
    return clone;
  };

  return redisConnection;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisConnection) {
    try {
      await redisConnection.quit();
      redisConnection = null;
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
      throw error;
    }
  }
};
