// Idempotency service — checks Redis for duplicate requests (prevents double charges on retries). Caches successful responses for 24 hours.
import { redis } from '@settlr/redis';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import type { ITransaction } from '@settlr/types';

const PREFIX = 'idempotency:';

export const idempotencyService = {
  // Check if a response for this key already exists in cache
  async get(key: string): Promise<ITransaction | null> {
    const cached = await redis.get(`${PREFIX}${key}`);
    if (!cached) return null;

    logger.debug('idempotency_cache_hit', { key });
    return JSON.parse(cached) as ITransaction;
  },

  // Cache the successful transaction response for 24 hours
  async set(key: string, data: ITransaction): Promise<void> {
    await redis.setex(
      `${PREFIX}${key}`,
      config.idempotencyTtlSeconds,
      JSON.stringify(data)
    );
    logger.debug('idempotency_cache_set', { key, ttl: config.idempotencyTtlSeconds });
  },
};
