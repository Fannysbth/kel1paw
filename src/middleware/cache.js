const { getRedis } = require('../config/redis');

const checkCache = (key) => {
  return async (req, res, next) => {
    try {
      const redisClient = getRedis();
      const cachedData = await redisClient.get(key); // langsung get(), Promise sudah
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
