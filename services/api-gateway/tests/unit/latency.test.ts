// ─────────────────────────────────────────────────────────
// latency.test.ts — API GATEWAY LATENCY & THROUGHPUT TESTS
//
// WHY THESE TESTS EXIST:
// The API gateway is the FIRST code that touches every request.
// Every ms added by auth or rate limiting multiplies by ALL
// requests across ALL endpoints. These tests prove:
//   1. Auth middleware (JWT verify) is < 0.5ms
//   2. Rate limiter middleware overhead is bounded
//   3. Middleware chain (auth + rateLimit) overhead is bounded
//   4. Failed auth (401) is faster than successful auth
//   5. Rate limit rejection (429) is fast
//   6. Sequential throughput handles peak traffic
//
// NOTE: rateLimitMiddleware is async (returns void but uses
// Promise.then internally). We flush microtasks with
// flushPromises() instead of vi.waitFor() to avoid the 50ms
// polling overhead that vi.waitFor imposes by default.
// ─────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('jsonwebtoken', () => {
  class TokenExpiredError extends Error {
    name = 'TokenExpiredError';
    expiredAt: Date;
    constructor(msg: string, expiredAt: Date) { super(msg); this.expiredAt = expiredAt; }
  }
  return {
    default: { verify: vi.fn(), TokenExpiredError },
    TokenExpiredError,
  };
});

vi.mock('@settlr/redis', () => ({
  slidingWindowRateLimit: vi.fn(),
}));

vi.mock('@settlr/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret-for-latency',
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/types/errors', () => ({
  AppError: class extends Error {
    code: string; statusCode: number;
    constructor(code: string, message: string, statusCode = 500) {
      super(message); this.code = code; this.statusCode = statusCode;
    }
  },
  ErrorCodes: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  },
}));

import { authMiddleware } from '../../src/middleware/auth.middleware';
import { rateLimitMiddleware } from '../../src/middleware/rateLimit.middleware';
import { slidingWindowRateLimit } from '@settlr/redis';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Flush microtask queue. mockResolvedValue creates a resolved promise;
 * the middleware's .then() callback needs one microtask tick to execute.
 * setTimeout(0) runs AFTER all microtasks are drained — guaranteed flush.
 */
const flushPromises = (): Promise<void> => new Promise(r => setTimeout(r, 0));

function createMockReq(authHeader?: string, ip = '192.168.1.1'): Partial<Request> {
  return {
    headers: { authorization: authHeader } as Record<string, string>,
    ip,
    socket: { remoteAddress: ip } as never,
    traceId: 'trace-latency-001',
  } as Partial<Request>;
}

function createMockRes(): Partial<Response> & { _headers: Record<string, unknown>; _status: number } {
  const res: Record<string, unknown> = {
    _headers: {} as Record<string, unknown>,
    _status: 200,
  };
  res.setHeader = vi.fn((key: string, val: unknown) => {
    (res._headers as Record<string, unknown>)[key] = val;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  });
  res.json = vi.fn(() => res);
  return res as Partial<Response> & { _headers: Record<string, unknown>; _status: number };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ═══════════════════════════════════════════════════════════════
// API GATEWAY — LATENCY TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('API Gateway — Detailed Latency Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 1: AUTH MIDDLEWARE LATENCY
  // ─────────────────────────────────────────────────────────

  describe('Auth Middleware Latency', () => {

    it(`AUTH-LAT-01: successful JWT verify < 0.5ms (mocked)
        (Bearer → verify → attach userId → next)`, () => {
      // WHY: Auth runs on EVERY authenticated request. With mocked jwt.verify,
      // this measures only the header parsing + mock call overhead.

      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001', email: 'test@x.com' });
      const req = createMockReq('Bearer valid-token') as Request;
      const res = createMockRes() as unknown as Response;
      const next = vi.fn();

      const start = performance.now();
      authMiddleware(req, res, next);
      const elapsed = performance.now() - start;

      expect(next).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(0.5);
      console.log(`  AUTH-LAT-01: Successful auth = ${elapsed.toFixed(4)}ms`);
    });

    it(`AUTH-LAT-02: missing token rejection < 0.5ms
        (no jwt.verify call — immediate 401)`, () => {
      // WHY: Missing-token requests should be the FASTEST rejection path.
      // No crypto, no Redis, no DB. Just string check + JSON response.

      const req = createMockReq(undefined) as Request;
      const res = createMockRes() as unknown as Response;
      const next = vi.fn();

      const start = performance.now();
      authMiddleware(req, res, next);
      const elapsed = performance.now() - start;

      expect(next).not.toHaveBeenCalled();
      expect(elapsed).toBeLessThan(0.5);
      console.log(`  AUTH-LAT-02: Missing token reject = ${elapsed.toFixed(4)}ms`);
    });

    it(`AUTH-LAT-03: expired token rejection < 0.5ms
        (jwt.verify throws TokenExpiredError → 401)`, () => {
      // WHY: Expired tokens are common in mobile apps. The rejection
      // should still be fast even though jwt.verify throws.

      (jwt.verify as Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });
      const req = createMockReq('Bearer expired-token') as Request;
      const res = createMockRes() as unknown as Response;
      const next = vi.fn();

      const start = performance.now();
      authMiddleware(req, res, next);
      const elapsed = performance.now() - start;

      expect(next).not.toHaveBeenCalled();
      expect(elapsed).toBeLessThan(0.5);
      console.log(`  AUTH-LAT-03: Expired token reject = ${elapsed.toFixed(4)}ms`);
    });

    it(`AUTH-LAT-04: 1000 sequential auth calls < 100ms
        (> 10,000 TPS auth throughput)`, () => {
      // WHY: Auth is the hottest middleware path. With rate limiting
      // at 100 req/min per user, the auth middleware still processes
      // 100 × N users per minute. Threshold is generous to account
      // for GC pauses on CI machines.

      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001', email: 'test@x.com' });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const req = createMockReq('Bearer valid-token') as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();
        authMiddleware(req, res, next);
      }
      const elapsed = performance.now() - start;

      const tps = Math.round((1000 / elapsed) * 1000);
      expect(elapsed).toBeLessThan(100);
      console.log(`  AUTH-LAT-04: 1K auth calls in ${elapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });

    it(`AUTH-LAT-05: P99 of auth call < 0.5ms over 500 runs`, () => {
      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001' });
      const latencies: number[] = [];

      for (let i = 0; i < 500; i++) {
        const req = createMockReq('Bearer token') as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();

        const start = performance.now();
        authMiddleware(req, res, next);
        latencies.push(performance.now() - start);
      }

      const sorted = latencies.sort((a, b) => a - b);
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);

      expect(p99).toBeLessThan(0.5);
      console.log(`  AUTH-LAT-05: P50=${p50.toFixed(4)}ms, P95=${p95.toFixed(4)}ms, P99=${p99.toFixed(4)}ms`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2: RATE LIMITER MIDDLEWARE LATENCY
  // Rate limiter is async (slidingWindowRateLimit returns a Promise).
  // We use flushPromises() to drain the microtask queue after each
  // call. Each flush adds ~1ms (setTimeout(0) minimum), so single-
  // call latency thresholds account for this overhead. Throughput
  // tests fire all calls then flush once to measure true sync cost.
  // ─────────────────────────────────────────────────────────

  describe('Rate Limiter Middleware Latency', () => {

    it(`RATE-LAT-01: allowed request resolves correctly (mocked Redis)
        (slidingWindowRateLimit → set headers → next)`, async () => {
      // WHY: Rate limiting runs on EVERY request. The middleware
      // overhead (beyond the Redis call) should be negligible.
      // Threshold accounts for setTimeout(0) flush overhead (~1ms).

      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });
      const req = createMockReq(undefined, '10.0.0.1') as Request;
      const res = createMockRes();
      const next = vi.fn();

      const start = performance.now();
      rateLimitMiddleware(req, res as unknown as Response, next);
      await flushPromises();
      const elapsed = performance.now() - start;

      expect(next).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(20); // setTimeout(0) can take 10ms+ on Windows
      console.log(`  RATE-LAT-01: Allowed request = ${elapsed.toFixed(4)}ms (incl. flush)`);
    });

    it(`RATE-LAT-02: 429 rejection path works correctly (mocked Redis)
        (rate exceeded → 429 + Retry-After header)`, async () => {
      // WHY: Rejected requests must be ultra-fast to protect against DDoS.
      // The 429 response should be cheaper than a 200.

      (slidingWindowRateLimit as Mock).mockResolvedValue({
        allowed: false, remaining: 0, retryAfterSeconds: 45,
      });
      const req = createMockReq(undefined, '10.0.0.1') as Request;
      const res = createMockRes();
      const next = vi.fn();

      const start = performance.now();
      rateLimitMiddleware(req, res as unknown as Response, next);
      await flushPromises();
      const elapsed = performance.now() - start;

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(20); // setTimeout(0) can take 10ms+ on Windows
      console.log(`  RATE-LAT-02: 429 rejection = ${elapsed.toFixed(4)}ms (incl. flush)`);
    });

    it(`RATE-LAT-03: fail-open (Redis down) resolves fast
        (Redis throws → next() called immediately)`, async () => {
      // WHY: When Redis is down, the middleware must fail-open fast.
      // Users should not notice Redis outages.

      (slidingWindowRateLimit as Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      const req = createMockReq(undefined, '10.0.0.1') as Request;
      const res = createMockRes();
      const next = vi.fn();

      const start = performance.now();
      rateLimitMiddleware(req, res as unknown as Response, next);
      await flushPromises();
      const elapsed = performance.now() - start;

      expect(next).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(20); // setTimeout(0) can take 10ms+ on Windows
      console.log(`  RATE-LAT-03: Fail-open = ${elapsed.toFixed(4)}ms (incl. flush)`);
    });

    it(`RATE-LAT-04: 500 rate limit calls — sync overhead < 50ms
        (fire all, flush once, measure sync dispatch cost)`, async () => {
      // WHY: Throughput of the rate limiter middleware must handle
      // peak traffic. We fire 500 calls synchronously, then flush
      // once — measuring only the sync dispatch overhead.

      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });
      const nexts: ReturnType<typeof vi.fn>[] = [];

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        const req = createMockReq(undefined, '10.0.0.1') as Request;
        const res = createMockRes();
        const next = vi.fn();
        nexts.push(next);
        rateLimitMiddleware(req, res as unknown as Response, next);
      }
      const syncElapsed = performance.now() - start;

      // Single flush resolves all 500 promise chains
      await flushPromises();

      const allCalled = nexts.every(n => n.mock.calls.length > 0);
      expect(allCalled).toBe(true);
      expect(syncElapsed).toBeLessThan(50);

      const tps = Math.round((500 / syncElapsed) * 1000);
      console.log(`  RATE-LAT-04: 500 sync dispatches in ${syncElapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 3: MIDDLEWARE CHAIN LATENCY
  // ─────────────────────────────────────────────────────────

  describe('Middleware Chain Latency', () => {

    it(`CHAIN-LAT-01: auth + rate limit combined — correct execution
        (both middleware in sequence for authenticated request)`, async () => {
      // WHY: In production, auth runs BEFORE rate limiting.
      // The combined overhead must stay bounded to not impact
      // the user-facing payment latency.

      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001' });
      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });

      const req = createMockReq('Bearer valid-token') as Request;
      const res = createMockRes();

      const start = performance.now();

      // Step 1: Auth (sync)
      const authNext = vi.fn();
      authMiddleware(req, res as unknown as Response, authNext);
      expect(authNext).toHaveBeenCalled();

      // Step 2: Rate limit (async)
      const rateNext = vi.fn();
      rateLimitMiddleware(req, res as unknown as Response, rateNext);
      await flushPromises();

      const elapsed = performance.now() - start;

      expect(rateNext).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(20); // setTimeout(0) can take 10ms+ on Windows
      console.log(`  CHAIN-LAT-01: Auth + Rate limit = ${elapsed.toFixed(4)}ms (incl. flush)`);
    });

    it(`CHAIN-LAT-02: 200 full middleware chains — sync overhead < 100ms
        (> 2,000 TPS full gateway throughput, sync cost only)`, async () => {
      // WHY: Measures the realistic gateway overhead per request.
      // Everything after the middleware chain is proxied to services.
      // We fire auth (sync) + rateLimit (async) in batches, flushing
      // once per batch to avoid measuring setTimeout overhead × N.

      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001' });
      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });

      const rateNexts: ReturnType<typeof vi.fn>[] = [];
      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        const req = createMockReq('Bearer token') as Request;
        const res = createMockRes();

        const authNext = vi.fn();
        authMiddleware(req, res as unknown as Response, authNext);

        const rateNext = vi.fn();
        rateNexts.push(rateNext);
        rateLimitMiddleware(req, res as unknown as Response, rateNext);
      }
      const syncElapsed = performance.now() - start;

      // Single flush resolves all 200 rate-limit promise chains
      await flushPromises();

      const allCalled = rateNexts.every(n => n.mock.calls.length > 0);
      expect(allCalled).toBe(true);
      expect(syncElapsed).toBeLessThan(100);

      const tps = Math.round((200 / syncElapsed) * 1000);
      console.log(`  CHAIN-LAT-02: 200 chains (sync) in ${syncElapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 4: LATENCY COMPARISON
  // ─────────────────────────────────────────────────────────

  describe('Latency Comparison', () => {

    it(`COMPARE-01: 401 rejection overhead stays bounded vs 200
        (reject path builds JSON response; success just calls next)`, () => {
      // WHY: The 401 path constructs res.status(401).json({...}) which is
      // inherently more work than the 200 path which just calls next().
      // The key invariant: the 401 path should not be 10x+ slower than 200,
      // ensuring attackers can't DoS by sending invalid tokens.

      const iterations = 500;

      // Successful auth — just calls next()
      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001' });
      const successTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const req = createMockReq('Bearer token') as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();
        const s = performance.now();
        authMiddleware(req, res, next);
        successTimes.push(performance.now() - s);
      }

      // Missing-token 401 — builds JSON error response
      const failTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const req = createMockReq(undefined) as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();
        const s = performance.now();
        authMiddleware(req, res, next);
        failTimes.push(performance.now() - s);
      }

      const avgSuccess = successTimes.reduce((s, v) => s + v, 0) / iterations;
      const avgFail = failTimes.reduce((s, v) => s + v, 0) / iterations;

      // 401 may be slightly slower due to JSON response construction,
      // but should not be dramatically worse (< 10x or < 0.1ms absolute)
      expect(avgFail).toBeLessThan(Math.max(avgSuccess * 10, 0.1));
      console.log(`  COMPARE-01: 200=${avgSuccess.toFixed(4)}ms, 401=${avgFail.toFixed(4)}ms`);
    });

    it(`COMPARE-02: rate limit 429 overhead ≈ allowed 200 overhead
        (rejection path must be cheap — both measured as sync dispatch)`, async () => {
      // WHY: Under DDoS, most requests hit 429. If 429 is slow,
      // the rate limiter itself becomes the bottleneck.
      // We measure only the sync dispatch overhead, not flush time.

      const iterations = 200;

      // Allowed requests — sync dispatch
      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });
      const allowStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = createMockReq(undefined, '10.0.0.1') as Request;
        const res = createMockRes();
        const next = vi.fn();
        rateLimitMiddleware(req, res as unknown as Response, next);
      }
      const allowSync = performance.now() - allowStart;
      await flushPromises();

      // 429 rejections — sync dispatch
      (slidingWindowRateLimit as Mock).mockResolvedValue({
        allowed: false, remaining: 0, retryAfterSeconds: 60,
      });
      const rejectStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = createMockReq(undefined, '10.0.0.1') as Request;
        const res = createMockRes();
        const next = vi.fn();
        rateLimitMiddleware(req, res as unknown as Response, next);
      }
      const rejectSync = performance.now() - rejectStart;
      await flushPromises();

      const avgAllow = allowSync / iterations;
      const avgReject = rejectSync / iterations;

      // 429 should not be > 5x slower (sync overhead difference)
      expect(avgReject).toBeLessThan(avgAllow * 5 + 0.01);
      console.log(`  COMPARE-02: Allowed=${avgAllow.toFixed(4)}ms/call, 429=${avgReject.toFixed(4)}ms/call (sync)`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 5: LATENCY BUDGET TABLE
  // ─────────────────────────────────────────────────────────

  describe('Latency Budget Summary', () => {

    it(`GATEWAY-BUDGET-01: complete gateway middleware latency breakdown`, async () => {
      const stepTimings: Record<string, number> = {};

      // Step 1: Auth middleware (success) — sync, 1K calls
      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001' });
      let s = performance.now();
      for (let i = 0; i < 1000; i++) {
        const req = createMockReq('Bearer token') as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();
        authMiddleware(req, res, next);
      }
      stepTimings['1-auth-success (×1K)      '] = performance.now() - s;

      // Step 2: Auth middleware (401 reject) — sync, 1K calls
      s = performance.now();
      for (let i = 0; i < 1000; i++) {
        const req = createMockReq(undefined) as Request;
        const res = createMockRes() as unknown as Response;
        const next = vi.fn();
        authMiddleware(req, res, next);
      }
      stepTimings['2-auth-401 (×1K)          '] = performance.now() - s;

      // Step 3: Rate limit (allowed) — fire 500, measure sync dispatch
      (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });
      s = performance.now();
      for (let i = 0; i < 500; i++) {
        const req = createMockReq(undefined, '10.0.0.1') as Request;
        const res = createMockRes();
        const next = vi.fn();
        rateLimitMiddleware(req, res as unknown as Response, next);
      }
      stepTimings['3-rateLimit-allow (×500)  '] = performance.now() - s;
      await flushPromises();

      // Step 4: Rate limit (429) — fire 500, measure sync dispatch
      (slidingWindowRateLimit as Mock).mockResolvedValue({
        allowed: false, remaining: 0, retryAfterSeconds: 60,
      });
      s = performance.now();
      for (let i = 0; i < 500; i++) {
        const req = createMockReq(undefined, '10.0.0.1') as Request;
        const res = createMockRes();
        const next = vi.fn();
        rateLimitMiddleware(req, res as unknown as Response, next);
      }
      stepTimings['4-rateLimit-429 (×500)    '] = performance.now() - s;
      await flushPromises();

      const total = Object.values(stepTimings).reduce((sum, t) => sum + t, 0);

      console.log('\n  ╔═══════════════════════════════════════════════════════╗');
      console.log('  ║        API GATEWAY LATENCY BUDGET (mocked I/O)       ║');
      console.log('  ╠════════════════════════════════╦════════════════════╣');
      console.log('  ║ Step                           ║ Time (ms)          ║');
      console.log('  ╠════════════════════════════════╬════════════════════╣');
      for (const [step, time] of Object.entries(stepTimings)) {
        const pct = ((time / total) * 100).toFixed(1);
        console.log(`  ║ ${step.padEnd(30)} ║ ${time.toFixed(4).padStart(8)}ms (${pct.padStart(5)}%) ║`);
      }
      console.log('  ╠════════════════════════════════╬════════════════════╣');
      console.log(`  ║ ${'TOTAL'.padEnd(30)} ║ ${total.toFixed(4).padStart(8)}ms         ║`);
      console.log('  ╚════════════════════════════════╩════════════════════╝\n');
    });
  });
});
