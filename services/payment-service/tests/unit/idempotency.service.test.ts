// Unit tests for idempotency.service.ts — cache hit, cache miss, and set with TTL.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@settlr/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn() },
}));

vi.mock('@settlr/config', () => ({
  config: { idempotencyTtlSeconds: 86400 },
}));

vi.mock('@settlr/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { idempotencyService } from '../../src/services/idempotency.service';
import { redis } from '@settlr/redis';
import { config } from '@settlr/config';

const mockTransaction = {
  id: 'txn-001',
  idempotencyKey: 'key-001',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  amount: 50000,
  currency: 'INR',
  status: 'completed',
};

describe('IdempotencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('returns parsed transaction when cache hit', async () => {
      (redis.get as Mock).mockResolvedValue(JSON.stringify(mockTransaction));

      const result = await idempotencyService.get('key-001');

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-001');
      expect(result).toEqual(mockTransaction);
    });

    it('returns null when cache miss', async () => {
      (redis.get as Mock).mockResolvedValue(null);

      const result = await idempotencyService.get('key-missing');

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-missing');
      expect(result).toBeNull();
    });

    it('prepends "idempotency:" prefix to key', async () => {
      (redis.get as Mock).mockResolvedValue(null);

      await idempotencyService.get('my-key');

      expect(redis.get).toHaveBeenCalledWith('idempotency:my-key');
    });
  });

  describe('set', () => {
    it('stores serialized transaction with correct TTL', async () => {
      (redis.setex as Mock).mockResolvedValue('OK');

      await idempotencyService.set('key-001', mockTransaction as any);

      expect(redis.setex).toHaveBeenCalledWith(
        'idempotency:key-001',
        config.idempotencyTtlSeconds,
        JSON.stringify(mockTransaction)
      );
    });

    it('uses the configured TTL (86400 seconds = 24h)', async () => {
      (redis.setex as Mock).mockResolvedValue('OK');

      await idempotencyService.set('key-002', mockTransaction as any);

      // Second arg to setex is the TTL
      const ttlArg = (redis.setex as Mock).mock.calls[0][1];
      expect(ttlArg).toBe(86400);
    });
  });
});
