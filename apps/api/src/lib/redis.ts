import Redis from 'ioredis';
import { config } from '../config/env';

export const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 1) {
      return null; // Stop retrying after 1 attempt in dev
    }
    return 100;
  },
});

redis.on('error', (_err) => {
  // Graceful fallback: Redis is optional for dev/tests
});
