import Redis from 'ioredis';

let redisConnection = null;

const attachErrorHandler = (client, label) => {
  if (client.listenerCount('error') === 0) {
    client.on('error', (err) => console.error(`[Redis:${label}]`, err.message));
  }
};

export const getRedisConnection = () => {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is not defined');

  const isTls = redisUrl.startsWith('rediss://');
  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(isTls && { tls: { rejectUnauthorized: false } }),
  });

  attachErrorHandler(redisConnection, 'main');

  const originalDuplicate = redisConnection.duplicate.bind(redisConnection);
  redisConnection.duplicate = (...args) => {
    const clone = originalDuplicate(...args);
    attachErrorHandler(clone, 'duplicate');
    return clone;
  };

  return redisConnection;
};

export const disconnectRedis = async () => {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('[Redis] Connection closed');
  }
};
