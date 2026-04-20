import Redis from "ioredis";

const redisConfig = {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 2000);
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
  if (!isConnected) return fallback;
  try {
    return await operation();
  } catch (err) {
    console.error("❌ [Redis] Operation failed:", err.message);
    return fallback;
  }
};

// Socket.io pub/sub needs its own dedicated connection
export const createRedisDuplicate = () => {
  const dup = redis.duplicate();
  dup.on("error", (err) => console.error("❌ [Redis Pub/Sub]", err.message));
  return dup;
};

export default redis;
