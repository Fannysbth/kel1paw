// src/config/redis.js
const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', err => console.error('Redis Client Error', err));
  await redisClient.connect();
  console.log('Connected to Redis ✅');
};

const getRedis = () => {
  if (!redisClient) throw new Error('Redis not connected');
  return redisClient;
};

module.exports = { connectRedis, getRedis };
