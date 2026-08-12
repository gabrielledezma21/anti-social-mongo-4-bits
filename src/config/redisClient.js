const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const client = redisUrl ? createClient({ url: redisUrl }) : null;
if (client) client.on('error', (error) => console.error('Redis error:', error.message));

const noop = async () => null;
const redisClient = client || {
  get: noop,
  set: noop,
  del: noop,
  sendCommand: noop,
  flushAll: noop
};

let connectionPromise;
const conectarRedis = async () => {
  if (!client || client.isOpen) return;
  connectionPromise ??= client.connect().catch((error) => {
    connectionPromise = undefined;
    throw error;
  });
  await connectionPromise;
};

module.exports = { redisClient, conectarRedis };
