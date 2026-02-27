// ═══════════════════════════════════════════════════════════════
// VELOCITY RULE UNIT TESTS
// Tests Redis INCR-based rate limiting: >3 txns in 60s → +25 pts
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@settlr/redis', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

import { checkVelocity } from '../../../src/engine/rules/velocityRule';
import { redis } from '@settlr/redis';

describe('VelocityRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.expire as Mock).mockResolvedValue(1);
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-01: returns null when account has 3 or fewer transactions in last 60 seconds (does not fire)`, async () => {
    (redis.incr as Mock).mockResolvedValue(3); // exactly 3 — threshold not exceeded

    const signal = await checkVelocity('acc-id');

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-02: returns 25-point signal when account has more than 3 transactions in 60 seconds`, async () => {
    (redis.incr as Mock).mockResolvedValue(4); // 4 = exceeds threshold

    const signal = await checkVelocity('acc-id');

    expect(signal).not.toBeNull();
    expect(signal!.scoreAdded).toBe(25);
    expect(signal!.ruleName).toBe('VELOCITY_CHECK');
    expect(signal!.signalData.transactionsInLastMinute).toBe(4);
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-03: sets TTL to exactly 60 seconds so counter resets after one minute`, async () => {
    (redis.incr as Mock).mockResolvedValue(1);

    await checkVelocity('acc-id');

    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringContaining('acc-id'), 60
    );
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-04: uses account-specific key so different accounts do not share velocity counters`, async () => {
    (redis.incr as Mock).mockResolvedValue(1);

    await checkVelocity('acc-111');
    await checkVelocity('acc-222');

    const keys = (redis.incr as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(keys[0]).toContain('acc-111');
    expect(keys[1]).toContain('acc-222');
    expect(keys[0]).not.toBe(keys[1]);
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-05: returns signal with high count when velocity is extreme (10 txns)`, async () => {
    (redis.incr as Mock).mockResolvedValue(10);

    const signal = await checkVelocity('acc-burst');

    expect(signal).not.toBeNull();
    expect(signal!.signalData.transactionsInLastMinute).toBe(10);
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-06: returns null when account has only 1 transaction (well below threshold)`, async () => {
    (redis.incr as Mock).mockResolvedValue(1);

    const signal = await checkVelocity('acc-first-txn');

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`VEL-07: uses fraud:velocity: key prefix for namespacing`, async () => {
    (redis.incr as Mock).mockResolvedValue(1);

    await checkVelocity('acc-test');

    expect(redis.incr).toHaveBeenCalledWith('fraud:velocity:acc-test');
  });
});
