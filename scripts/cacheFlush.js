const redis = require("redis");
const { promisify } = require("util");

const redisUrl = process.env.REDIS_URL || "";
const redisClient = redis.createClient(redisUrl);
const flushAsync = promisify(redisClient.flushall).bind(redisClient);

flushAsync().then(() => {
  redisClient.quit();
});
