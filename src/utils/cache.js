import { getRedisConnection } from "../config/redis.js";

const memoryCache = new Map();

const buildMemoryKey = (key) => `mem:${key}`;

const getFromMemory = (key) => {
  const entry = memoryCache.get(buildMemoryKey(key));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(buildMemoryKey(key));
    return null;
  }
  return entry.value;
};

const setInMemory = (key, value, ttlMs) => {
  memoryCache.set(buildMemoryKey(key), {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

export const getCachedJson = async (key) => {
  try {
    const redis = getRedisConnection();
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return getFromMemory(key);
  }
};

export const setCachedJson = async (key, value, ttlMs) => {
  try {
    const redis = getRedisConnection();
    await redis.set(key, JSON.stringify(value), "PX", ttlMs);
  } catch {
    setInMemory(key, value, ttlMs);
  }
};

export const invalidateByPrefix = async (prefix) => {
  try {
    const redis = getRedisConnection();
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    const fullPrefix = buildMemoryKey(prefix);
    for (const key of memoryCache.keys()) {
      if (key.startsWith(fullPrefix)) {
        memoryCache.delete(key);
      }
    }
  }
};
