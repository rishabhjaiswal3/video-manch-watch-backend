"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectRedis = exports.getRedisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
let redisConnection = null;
const getRedisConnection = () => {
    if (redisConnection) {
        return redisConnection;
    }
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL is not defined in environment variables');
    }
    const isTls = redisUrl.startsWith('rediss://');
    redisConnection = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        ...(isTls && { tls: { rejectUnauthorized: false } }),
    });
    redisConnection.on('connect', () => {
        console.log('Connected to Redis');
    });
    redisConnection.on('error', (err) => {
        console.error('Redis error:', err);
    });
    return redisConnection;
};
exports.getRedisConnection = getRedisConnection;
const disconnectRedis = async () => {
    if (redisConnection) {
        try {
            await redisConnection.quit();
            redisConnection = null;
            console.log('Redis connection closed gracefully');
        }
        catch (error) {
            console.error('Error closing Redis connection:', error);
            throw error;
        }
    }
};
exports.disconnectRedis = disconnectRedis;
//# sourceMappingURL=redis.js.map