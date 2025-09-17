// middleware/cache.js
const { getRedis } = require('../config/redis');


// Middleware to check cache before processing request
const checkCache = (key) => {
  return async (req, res, next) => {
    try {
      const { getAsync } = getRedis();
      const cachedData = await getAsync(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = { checkCache };