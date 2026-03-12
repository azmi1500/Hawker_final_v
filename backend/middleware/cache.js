// backend/middleware/cache.js
const { getRedis } = require('../config/redis');

// Cache middleware for GET requests
exports.cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.user?.id}:${req.originalUrl}`;
    
    try {
      const redis = getRedis();
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        console.log(`✅ Cache hit: ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      // Store original send
      const originalSend = res.json;
      
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode === 200) {
          redis.setex(key, duration, JSON.stringify(data));
          console.log(`📦 Cache set: ${key} (${duration}s)`);
        }
        
        originalSend.call(this, data);
      };
      
      next();
    } catch (err) {
      console.error('❌ Cache error:', err);
      next();
    }
  };
};

// Clear cache for user
exports.clearUserCache = async (userId) => {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`cache:${userId}:*`);
    
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`🧹 Cleared ${keys.length} cache entries for user ${userId}`);
    }
  } catch (err) {
    console.error('❌ Cache clear error:', err);
  }
};