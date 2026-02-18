// Upstash Redis singleton — used for distributed locks, idempotency cache, rate limiting, and fraud rule counters.
// Import { redis } from '@settlr/redis' in any service that needs caching or locking.
// Uses ioredis which supports the full Redis command set including NX, EX, INCR, ZADD, etc.
//
// Import path: import { redis, connectRedis, acquireLock, releaseLock } from '@settlr/redis';
//
// This module provides:
//   redis         — raw ioredis client for custom commands
//   connectRedis  — startup health check
//   acquireLock   — distributed lock (SET key value EX ttl NX)
//   releaseLock   — release lock (DEL key)
//   slidingWindowRateLimit — rate limiter for api-gateway

import Redis from 'ioredis';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';

/**
 * Creates the shared Redis client pointing to Upstash.
 * Upstash uses TLS (rediss:// protocol), so no extra SSL config is needed.
 * ioredis auto-detects the rediss:// scheme and enables TLS.
 *
 * lazyConnect: true means we control exactly when the TCP connection is made.
 * This lets us call connectRedis() explicitly during service startup, after
 * all middleware is registered but before the server starts listening.
 */
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,    // Retry failed commands up to 3 times
  retryStrategy(times: number): number | null {
    // Exponential backoff: 50ms, 100ms, 200ms, then give up
    if (times > 3) return null;
    return Math.min(times * 50, 200);
  },
  lazyConnect: true,           // Don't connect until connectRedis() is called
  enableReadyCheck: true,      // Verify Redis is ready after connecting
});

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connects to Redis and verifies the connection with a PING.
 * Call this during service startup to fail fast if Redis is unreachable.
 * Returns true if the connection is healthy, false otherwise.
 *
 * Usage (in service index.ts):
 *   const redisOk = await connectRedis();
 *   if (!redisOk) process.exit(1);
 */
export async function connectRedis(): Promise<boolean> {
  try {
    await redis.connect();
    const pong = await redis.ping();
    logger.info('redis_connected', { response: pong });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Redis error';
    logger.error('redis_connection_failed', { error: message });
    return false;
  }
}

/**
 * Gracefully disconnects from Redis.
 * Call this in the shutdown handler (SIGTERM) to clean up connections.
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('redis_disconnected');
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTED LOCKING — Used by payment-service to prevent concurrent balance updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tries to acquire a distributed lock using Redis SET ... NX EX.
 * NX = only set if key does NOT already exist (atomic check-and-set)
 * EX = auto-expire after ttlSeconds (prevents dead locks if process crashes)
 *
 * Returns true if the lock was acquired, false if someone else holds it.
 *
 * IMPORTANT: Always release in a `finally` block. Never put release anywhere else.
 *
 * Usage:
 *   const acquired = await acquireLock('lock:account:abc-123', 10);
 *   if (!acquired) throw AppError.accountLocked();
 *   try {
 *     // ... do work while holding lock
 *   } finally {
 *     await releaseLock('lock:account:abc-123');
 *   }
 *
 * @param key          - Redis key (e.g. 'lock:account:<uuid>')
 * @param ttlSeconds   - How long the lock lives before auto-expiring (default 10s)
 * @returns true if lock acquired, false if already held by another process
 */
export async function acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
  // SET key "1" EX ttlSeconds NX — atomic compare-and-set
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  const acquired = result === 'OK';

  if (acquired) {
    logger.debug('lock_acquired', { key, ttl: ttlSeconds });
  } else {
    logger.debug('lock_already_held', { key });
  }

  return acquired;
}

/**
 * Releases a distributed lock by deleting the Redis key.
 * Always call this in a `finally` block — even if the operation throws.
 *
 * @param key - Redis key to release (e.g. 'lock:account:<uuid>')
 */
export async function releaseLock(key: string): Promise<void> {
  await redis.del(key);
  logger.debug('lock_released', { key });
}

/**
 * Acquires two account locks in sorted UUID order to prevent deadlocks.
 * This is the exact pattern from the doc (Section 7.1, Step 2):
 *   - Sort UUIDs alphabetically BEFORE locking
 *   - If Thread A locks account-1 then account-2, and Thread B locks account-2
 *     then account-1, they deadlock. Sorting prevents this.
 *
 * Returns { acquired: true, lockKeys: [key1, key2] } on success,
 * or { acquired: false, lockKeys: [] } if either lock fails.
 * On partial failure, any acquired lock is immediately released.
 *
 * @param accountId1  - First account UUID
 * @param accountId2  - Second account UUID
 * @param ttlSeconds  - Lock TTL (default 10 seconds)
 */
export async function acquireAccountLocks(
  accountId1: string,
  accountId2: string,
  ttlSeconds: number = 10
): Promise<{ acquired: boolean; lockKeys: string[] }> {
  // CRITICAL: Sort UUIDs alphabetically to prevent deadlocks
  const sorted = [accountId1, accountId2].sort();
  const lockKey1 = `lock:account:${sorted[0]}`;
  const lockKey2 = `lock:account:${sorted[1]}`;

  const lock1 = await acquireLock(lockKey1, ttlSeconds);
  if (!lock1) {
    return { acquired: false, lockKeys: [] };
  }

  const lock2 = await acquireLock(lockKey2, ttlSeconds);
  if (!lock2) {
    // Failed to get second lock — release the first to avoid dead lock
    await releaseLock(lockKey1);
    return { acquired: false, lockKeys: [] };
  }

  logger.debug('account_locks_acquired', {
    accounts: sorted,
    lockKeys: [lockKey1, lockKey2],
  });

  return { acquired: true, lockKeys: [lockKey1, lockKey2] };
}

/**
 * Releases multiple locks at once. Always call in a `finally` block.
 *
 * @param lockKeys - Array of Redis lock keys to release
 */
export async function releaseAllLocks(lockKeys: string[]): Promise<void> {
  for (const key of lockKeys) {
    await releaseLock(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING — Sliding window counter for api-gateway
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Implements a sliding window rate limiter using Redis INCR + EXPIRE.
 * Returns { allowed: true, remaining: N } if under limit,
 * or { allowed: false, remaining: 0, retryAfterSeconds: N } if over limit.
 *
 * How it works:
 *   1. Creates a key like "ratelimit:192.168.1.1:1708272000" (IP + time window)
 *   2. Increments the counter atomically
 *   3. Sets TTL on first increment so the key auto-expires after the window
 *   4. Compares counter to maxRequests
 *
 * @param identifier  - Unique identifier (e.g. IP address, user ID)
 * @param windowMs    - Time window in milliseconds (e.g. 60000 for 1 minute)
 * @param maxRequests - Maximum requests allowed in the window (e.g. 100)
 */
export async function slidingWindowRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number }> {
  // Create a time-bucketed key so counters auto-rotate per window
  const windowStart = Math.floor(Date.now() / windowMs);
  const key = `ratelimit:${identifier}:${windowStart}`;

  // Atomically increment and get the current count
  const count = await redis.incr(key);

  // Set expiry only on the first increment (when count is 1)
  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  if (count > maxRequests) {
    // Calculate how many seconds until the current window expires
    const ttl = await redis.pttl(key);
    const retryAfterSeconds = Math.ceil(ttl / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : 1,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - count,
  };
}
