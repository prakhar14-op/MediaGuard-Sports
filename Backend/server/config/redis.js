import Redis from "ioredis";

let hasLoggedError = false;

const redisConfig = {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  // Upstash requires TLS — enabled automatically when URL starts with rediss://
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
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

redis.on("connect", () => { isConnected = true; hasLoggedError = false; console.log("✅ [Redis] Connected"); });
redis.on("ready",   () => { isConnected = true; hasLoggedError = false; console.log("🚀 [Redis] Ready"); });
redis.on("error",   (err) => {
  isConnected = false;
  if (!hasLoggedError) {
    console.error("❌ [Redis]", err.message);
    console.warn("⚠️  [Redis] Running without cache/velocity tracking. Set REDIS_URL in .env to enable.");
    hasLoggedError = true;
  }
});
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
