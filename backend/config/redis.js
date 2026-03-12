// backend/config/redis.js
const Redis = require('ioredis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });

    return redisClient;
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    return null;
  }
};

const getRedis = () => {
  if (!redisClient) {
    throw new Error('Redis not connected');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedis };