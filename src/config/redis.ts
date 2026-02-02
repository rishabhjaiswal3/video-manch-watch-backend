import Redis from 'ioredis';

let redisConnection: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in environment variables');
  }

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  redisConnection.on('connect', () => {
    console.log('Connected to Redis');
  });

  redisConnection.on('error', (err) => {
    console.error('Redis error:', err);
  });

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
