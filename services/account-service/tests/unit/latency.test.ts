// ─────────────────────────────────────────────────────────
// latency.test.ts — ACCOUNT SERVICE LATENCY & THROUGHPUT TESTS
//
// WHY THESE TESTS EXIST:
// Account operations (create, list, get, auth) are foundational.
// Every user interaction starts with auth and hits account-service.
// These tests prove:
//   1. Account CRUD overhead is bounded
//   2. Auth operations (register, login, refresh, logout) are fast
//   3. Pagination computation adds negligible overhead
//   4. P50/P95/P99 for hot paths
//   5. Throughput scales for peak traffic
//   6. bcrypt + JWT wrapper overhead is minimal (mocked)
// ─────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('random-uuid-001'),
}));

vi.mock('@settlr/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    bcryptSaltRounds: 12,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
}));

vi.mock('@settlr/types', () => ({
  toCamelCase: vi.fn((obj: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
}));

vi.mock('@settlr/types/errors', () => {
  class MockAppError extends Error {
    code: string; statusCode: number; isOperational = true;
    constructor(code: string, message: string, statusCode = 500) {
      super(message); this.code = code; this.statusCode = statusCode;
    }
    static notFound(resource: string, id: string) {
      return new MockAppError('NOT_FOUND', `${resource} ${id} not found`, 404);
    }
  }
  return {
    AppError: MockAppError,
    ErrorCodes: {
      NOT_FOUND: 'NOT_FOUND',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
      UNAUTHORIZED: 'UNAUTHORIZED',
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    },
  };
});

vi.mock('../../src/repositories/account.repository', () => ({
  accountRepository: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByIdAndUserId: vi.fn(),
    getTransactions: vi.fn(),
    getLedgerEntries: vi.fn(),
  },
}));

vi.mock('../../src/repositories/auth.repository', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    createUser: vi.fn(),
    getOrCreatePrimaryAccount: vi.fn(),
  },
}));

import { accountService } from '../../src/services/account.service';
import { authService } from '../../src/services/auth.service';
import { accountRepository } from '../../src/repositories/account.repository';
import { authRepository } from '../../src/repositories/auth.repository';
import { redis } from '@settlr/redis';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ── Test data ───────────────────────────────────────────────

const userId = 'user-uuid-latency';
const accountId = 'acc-uuid-latency';

const mockAccountRow = {
  id: accountId, user_id: userId, balance: 500000, currency: 'INR',
  status: 'active', version: 3,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
};

const mockUserRow = {
  id: userId, email: 'latency@settlr.com',
  password_hash: '$2b$12$hashed', phone: '+919876543210',
  is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
};

const mockTxRow = {
  id: 'tx-001', from_account_id: accountId, to_account_id: 'acc-other',
  amount: 100000, status: 'completed', created_at: '2026-01-10T00:00:00Z',
};

function setupAuthMocks() {
  (authRepository.findByEmail as Mock).mockResolvedValue(null);
  (bcrypt.hash as Mock).mockResolvedValue('$2b$12$newhash');
  (authRepository.createUser as Mock).mockResolvedValue(mockUserRow);
  (authRepository.getOrCreatePrimaryAccount as Mock).mockResolvedValue({ id: accountId, balance: 0, currency: 'INR' });
  (jwt.sign as Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
  (redis.setex as Mock).mockResolvedValue('OK');
}

function setupLoginMocks() {
  (authRepository.findByEmail as Mock).mockResolvedValue(mockUserRow);
  (bcrypt.compare as Mock).mockResolvedValue(true);
  (authRepository.getOrCreatePrimaryAccount as Mock).mockResolvedValue({ id: accountId, balance: 500000, currency: 'INR' });
  (jwt.sign as Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
  (redis.setex as Mock).mockResolvedValue('OK');
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT SERVICE — LATENCY TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Account Service — Detailed Latency Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 1: ACCOUNT CRUD LATENCY
  // ─────────────────────────────────────────────────────────

  describe('Account CRUD Latency', () => {

    it(`ACC-LAT-01: createAccount < 1ms (mocked DB)`, async () => {
      // WHY: Account creation is a single DB insert + camelCase transform.
      // Overhead should be negligible.

      (accountRepository.create as Mock).mockResolvedValue(mockAccountRow);

      const start = performance.now();
      const result = await accountService.createAccount(userId, 'INR');
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(elapsed).toBeLessThan(1);
      console.log(`  ACC-LAT-01: createAccount = ${elapsed.toFixed(3)}ms`);
    });

    it(`ACC-LAT-02: listAccounts < 1ms (mocked DB)`, async () => {
      (accountRepository.findByUserId as Mock).mockResolvedValue([mockAccountRow, { ...mockAccountRow, id: 'acc-2' }]);

      const start = performance.now();
      const result = await accountService.listAccounts(userId);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(elapsed).toBeLessThan(1);
      console.log(`  ACC-LAT-02: listAccounts = ${elapsed.toFixed(3)}ms`);
    });

    it(`ACC-LAT-03: getAccount < 1ms (mocked DB)`, async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);

      const start = performance.now();
      const result = await accountService.getAccount(accountId, userId);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(1);
      console.log(`  ACC-LAT-03: getAccount = ${elapsed.toFixed(3)}ms`);
    });

    it(`ACC-LAT-04: getTransactions with pagination < 1ms`, async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getTransactions as Mock).mockResolvedValue({
        items: Array(10).fill(mockTxRow), total: 25,
      });

      const start = performance.now();
      const result = await accountService.getTransactions(accountId, userId, 1, 10);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(result.data?.totalPages).toBe(3);
      expect(elapsed).toBeLessThan(1);
      console.log(`  ACC-LAT-04: getTransactions = ${elapsed.toFixed(3)}ms`);
    });

    it(`ACC-LAT-05: getLedgerEntries with pagination < 1ms`, async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getLedgerEntries as Mock).mockResolvedValue({
        items: [{ id: 'ledger-1', account_id: accountId, type: 'debit', amount: 50000 }],
        total: 1,
      });

      const start = performance.now();
      const result = await accountService.getLedgerEntries(accountId, userId, 1, 20);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(1);
      console.log(`  ACC-LAT-05: getLedgerEntries = ${elapsed.toFixed(3)}ms`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2: AUTH LATENCY
  // ─────────────────────────────────────────────────────────

  describe('Auth Operations Latency', () => {

    it(`AUTH-SVC-01: register flow < 2ms (mocked bcrypt, JWT)
        (findByEmail + hash + createUser + JWT sign × 2 + Redis setex)`, async () => {
      // WHY: Registration runs 6 async operations. Even mocked,
      // the orchestration overhead must be minimal.

      setupAuthMocks();

      const start = performance.now();
      const result = await authService.register('new@settlr.com', 'StrongP@ss1');
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(elapsed).toBeLessThan(2);
      console.log(`  AUTH-SVC-01: register = ${elapsed.toFixed(3)}ms`);
    });

    it(`AUTH-SVC-02: login flow < 2ms (mocked bcrypt, JWT)
        (findByEmail + compare + JWT sign × 2 + Redis setex)`, async () => {
      setupLoginMocks();

      const start = performance.now();
      const result = await authService.login('latency@settlr.com', 'StrongP@ss1');
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(2);
      console.log(`  AUTH-SVC-02: login = ${elapsed.toFixed(3)}ms`);
    });

    it(`AUTH-SVC-03: refresh flow < 2ms (mocked JWT)
        (verify + Redis get + findById + JWT sign × 2 + Redis setex)`, async () => {
      (jwt.verify as Mock).mockReturnValue({ userId, email: 'test@settlr.com' });
      (redis.get as Mock).mockResolvedValue('refresh-token-valid');
      (authRepository.findById as Mock).mockResolvedValue(mockUserRow);
      (jwt.sign as Mock).mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
      (redis.setex as Mock).mockResolvedValue('OK');

      const start = performance.now();
      const result = await authService.refresh('refresh-token-valid');
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(2);
      console.log(`  AUTH-SVC-03: refresh = ${elapsed.toFixed(3)}ms`);
    });

    it(`AUTH-SVC-04: logout flow < 0.5ms (single Redis del)`, async () => {
      (redis.del as Mock).mockResolvedValue(1);

      const start = performance.now();
      const result = await authService.logout(userId);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(0.5);
      console.log(`  AUTH-SVC-04: logout = ${elapsed.toFixed(3)}ms`);
    });

    it(`AUTH-SVC-05: invalid login rejection < 1ms
        (findByEmail → not found → throw)`, async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(null);

      const start = performance.now();
      try {
        await authService.login('nobody@settlr.com', 'pass');
      } catch {
        // Expected
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
      console.log(`  AUTH-SVC-05: Invalid login reject = ${elapsed.toFixed(3)}ms`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 3: THROUGHPUT TESTS
  // ─────────────────────────────────────────────────────────

  describe('Throughput', () => {

    it(`ACC-THRU-01: 500 sequential listAccounts < 50ms
        (> 10,000 TPS account listing throughput)`, async () => {
      (accountRepository.findByUserId as Mock).mockResolvedValue([mockAccountRow]);

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        await accountService.listAccounts(userId);
      }
      const elapsed = performance.now() - start;

      const tps = Math.round((500 / elapsed) * 1000);
      expect(elapsed).toBeLessThan(50);
      console.log(`  ACC-THRU-01: 500 listAccounts in ${elapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });

    it(`ACC-THRU-02: 500 sequential getAccount < 50ms
        (> 10,000 TPS single account retrieval)`, async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        await accountService.getAccount(accountId, userId);
      }
      const elapsed = performance.now() - start;

      const tps = Math.round((500 / elapsed) * 1000);
      expect(elapsed).toBeLessThan(50);
      console.log(`  ACC-THRU-02: 500 getAccount in ${elapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });

    it(`ACC-THRU-03: 200 sequential login flows < 50ms
        (> 4,000 TPS login throughput)`, async () => {
      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        vi.clearAllMocks();
        setupLoginMocks();
        await authService.login('test@settlr.com', 'StrongP@ss1');
      }
      const elapsed = performance.now() - start;

      const tps = Math.round((200 / elapsed) * 1000);
      expect(elapsed).toBeLessThan(50);
      console.log(`  ACC-THRU-03: 200 logins in ${elapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });

    it(`ACC-THRU-04: 1000 sequential logouts < 20ms
        (> 50,000 TPS logout — single Redis del)`, async () => {
      (redis.del as Mock).mockResolvedValue(1);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        await authService.logout(userId);
      }
      const elapsed = performance.now() - start;

      const tps = Math.round((1000 / elapsed) * 1000);
      expect(elapsed).toBeLessThan(20);
      console.log(`  ACC-THRU-04: 1K logouts in ${elapsed.toFixed(1)}ms = ${tps.toLocaleString()} TPS`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 4: PERCENTILE DISTRIBUTION
  // ─────────────────────────────────────────────────────────

  describe('Percentile Distribution', () => {

    it(`ACC-P50-01: P99 of getAccount < 0.5ms over 300 runs`, async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      const latencies: number[] = [];

      for (let i = 0; i < 300; i++) {
        const start = performance.now();
        await accountService.getAccount(accountId, userId);
        latencies.push(performance.now() - start);
      }

      const sorted = latencies.sort((a, b) => a - b);
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);

      expect(p99).toBeLessThan(0.5);
      console.log(`  ACC-P50-01: P50=${p50.toFixed(4)}ms, P95=${p95.toFixed(4)}ms, P99=${p99.toFixed(4)}ms`);
    });

    it(`ACC-P50-02: P99 of login < 1ms over 200 runs`, async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 200; i++) {
        vi.clearAllMocks();
        setupLoginMocks();

        const start = performance.now();
        await authService.login('test@settlr.com', 'StrongP@ss1');
        latencies.push(performance.now() - start);
      }

      const sorted = latencies.sort((a, b) => a - b);
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);

      expect(p99).toBeLessThan(1);
      console.log(`  ACC-P50-02: Login P50=${p50.toFixed(4)}ms, P95=${p95.toFixed(4)}ms, P99=${p99.toFixed(4)}ms`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 5: PAGINATION COMPUTATION OVERHEAD
  // ─────────────────────────────────────────────────────────

  describe('Pagination Computation Overhead', () => {

    it(`PAGE-LAT-01: pagination math (totalPages, hasMore) < 0.01ms
        per computation`, () => {
      // WHY: Pagination is pure math: Math.ceil(total / limit),
      // page < totalPages. Must not allocate or do anything expensive.

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const total = 250;
        const limit = 20;
        const page = (i % 13) + 1;
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;
        // Consume to prevent dead-code elimination
        if (hasMore && totalPages < 0) throw new Error('impossible');
      }
      const elapsed = performance.now() - start;
      const perCall = elapsed / iterations;

      expect(perCall).toBeLessThan(0.01);
      console.log(`  PAGE-LAT-01: Pagination math = ${perCall.toFixed(6)}ms/call`);
    });

    it(`PAGE-LAT-02: toCamelCase transform of 100-element array < 5ms`, () => {
      // WHY: Large result sets are transformed from snake_case to camelCase.
      // The transform must scale linearly.

      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: `tx-${i}`, from_account_id: 'acc-1', to_account_id: 'acc-2',
        amount: 50000, status: 'completed', created_at: '2026-01-01',
      }));

      const start = performance.now();
      for (let iter = 0; iter < 100; iter++) {
        rows.map(row => {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
            result[camelKey] = value;
          }
          return result;
        });
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      console.log(`  PAGE-LAT-02: 100 × toCamelCase(100 rows) = ${elapsed.toFixed(1)}ms`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 6: LATENCY BUDGET TABLE
  // ─────────────────────────────────────────────────────────

  describe('Latency Budget Summary', () => {

    it(`ACC-BUDGET-01: complete account service latency breakdown`, async () => {
      const stepTimings: Record<string, number> = {};

      // Step 1: createAccount
      (accountRepository.create as Mock).mockResolvedValue(mockAccountRow);
      let s = performance.now();
      for (let i = 0; i < 100; i++) await accountService.createAccount(userId, 'INR');
      stepTimings['1-createAccount (×100)    '] = performance.now() - s;

      // Step 2: listAccounts
      (accountRepository.findByUserId as Mock).mockResolvedValue([mockAccountRow]);
      s = performance.now();
      for (let i = 0; i < 100; i++) await accountService.listAccounts(userId);
      stepTimings['2-listAccounts (×100)     '] = performance.now() - s;

      // Step 3: getAccount
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      s = performance.now();
      for (let i = 0; i < 100; i++) await accountService.getAccount(accountId, userId);
      stepTimings['3-getAccount (×100)       '] = performance.now() - s;

      // Step 4: login
      s = performance.now();
      for (let i = 0; i < 100; i++) {
        vi.clearAllMocks();
        setupLoginMocks();
        (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
        await authService.login('test@settlr.com', 'pass');
      }
      stepTimings['4-login (×100)            '] = performance.now() - s;

      // Step 5: logout
      (redis.del as Mock).mockResolvedValue(1);
      s = performance.now();
      for (let i = 0; i < 100; i++) await authService.logout(userId);
      stepTimings['5-logout (×100)           '] = performance.now() - s;

      const total = Object.values(stepTimings).reduce((sum, t) => sum + t, 0);

      console.log('\n  ╔═══════════════════════════════════════════════════════╗');
      console.log('  ║      ACCOUNT SERVICE LATENCY BUDGET (mocked I/O)     ║');
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
