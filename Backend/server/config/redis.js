import Redis from "ioredis";

const redisConfig = {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  retryStrategy(times) {
    const maxRetries = 10;
    if (times > maxRetries) {
      console.error("❌ [Redis] Max retries reached. Stopping.");
      return null;
    }
    const delay = Math.min(times * 200, 2000);
    console.log(`⏳ [Redis] Retry ${times}/${maxRetries} in ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    return ["READONLY", "ECONNRESET"].some((e) => err.message.includes(e));
  },
};

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", redisConfig);

let isConnected = false;

redis.on("connect", () => { isConnected = true;  console.log("✅ [Redis] Connected"); });
redis.on("ready",   () => { isConnected = true;  console.log("🚀 [Redis] Ready"); });
redis.on("error",   (err) => { isConnected = false; console.error("❌ [Redis]", err.message); });
redis.on("close",   () => { isConnected = false; });
redis.on("end",     () => { isConnected = false; });

export const isRedisAvailable = () => isConnected;

export const safeRedis = async (operation, fallback = null) => {
  if (!isConnected) {
    console.warn("⚠️ [Redis] Not available, using fallback");
    return fallback;
  }
  try {
    return await operation();
  } catch (err) {
    console.error("❌ [Redis] Operation failed:", err.message);
    return fallback;
  }
};

/**
 * Pub/Sub duplicate — Socket.io needs a separate Redis connection for subscriptions.
 * The main connection can't be used for both commands and subscriptions simultaneously.
 */
export const createRedisDuplicate = () => {
  const dup = redis.duplicate();
  dup.on("error", (err) => console.error("❌ [Redis Pub/Sub]", err.message));
  return dup;
};

export default redis;
