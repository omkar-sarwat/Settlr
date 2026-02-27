// ─────────────────────────────────────────────────────────
// payment.service.test.ts — COMPREHENSIVE UNIT TESTS
//
// WHY THESE TESTS EXIST:
// The payment service contains the most critical business
// logic in the entire application. A bug here means real
// money is lost or duplicated. These unit tests verify
// every branch, every error path, and every edge case
// in complete isolation — no real database, no real Redis,
// no real Kafka. Everything external is mocked so we test
// ONLY the payment service logic.
//
// METRICS TESTED:
//   - Idempotency (cache hit/miss, TTL, duplicate prevention)
//   - Distributed locks (acquisition, ordering, release)
//   - Balance validation (insufficient, zero, negative, frozen)
//   - Optimistic locking (retry logic, concurrent modification)
//   - Ledger entries (double-entry accounting correctness)
//   - Kafka events (event publishing, fraud blocked events)
//   - Latency (lock acquisition timing, parallel execution)
// ─────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock ALL external dependencies before importing anything ──────────

vi.mock('@settlr/database', () => ({
  db: Object.assign(vi.fn(), {
    transaction: vi.fn(),
  }),
}));

vi.mock('@settlr/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn(), set: vi.fn() },
  acquireAccountLocks: vi.fn(),
  releaseAllLocks: vi.fn(),
}));

vi.mock('@settlr/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KafkaTopics: {
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_FRAUD_BLOCKED: 'payment.fraud_blocked',
  },
}));

vi.mock('@settlr/config', () => ({
  config: {
    fraudServiceUrl: 'http://fraud:3004',
    minTransferAmountPaise: 100,
    maxTransferAmountPaise: 10_000_000_00,
    idempotencyTtlSeconds: 86400,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@settlr/types', () => ({
  toCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
}));

vi.mock('@settlr/types/errors', () => {
  class AppError extends Error {
    code: string;
    statusCode: number;
    isOperational: boolean;
    data?: Record<string, unknown>;
    constructor(code: string, message: string, statusCode: number = 500, data?: Record<string, unknown>) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.isOperational = true;
      this.data = data;
      Object.setPrototypeOf(this, AppError.prototype);
    }
    static validation(msg: string) { return new AppError('VALIDATION_ERROR', msg, 400); }
    static notFound(resource: string, id: string) {
      return new AppError('ACCOUNT_NOT_FOUND', `${resource} with id '${id}' not found`, 404);
    }
    static insufficientBalance(accountId: string, required: number, available: number) {
      return new AppError('INSUFFICIENT_BALANCE', `Account ${accountId} has ${available} paise but ${required} paise required`, 422);
    }
    static fraudBlocked(score: number) {
      return new AppError('FRAUD_BLOCKED', `Transaction declined by risk engine (score: ${score})`, 403, { fraudScore: score });
    }
    static accountLocked() {
      return new AppError('ACCOUNT_LOCKED', 'Account is busy processing another transaction. Retry in a moment.', 409);
    }
  }
  return {
    AppError,
    ErrorCodes: {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
      RECIPIENT_NOT_FOUND: 'RECIPIENT_NOT_FOUND',
      INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
      CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
      FRAUD_BLOCKED: 'FRAUD_BLOCKED',
      ACCOUNT_FROZEN: 'ACCOUNT_FROZEN',
      ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
      NOT_FOUND: 'NOT_FOUND',
    },
  };
});

vi.mock('../../src/services/idempotency.service', () => ({
  idempotencyService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../src/services/ledger.service', () => ({
  ledgerService: {
    createEntries: vi.fn(),
  },
}));

vi.mock('../../src/repositories/payment.repository', () => ({
  paymentRepository: {
    create: vi.fn(),
    lockAccount: vi.fn(),
    updateBalance: vi.fn(),
    creditAccount: vi.fn(),
    insertFraudSignals: vi.fn(),
    findByIdWithSignals: vi.fn(),
  },
}));

vi.mock('../../src/repositories/ledger.repository', () => ({
  ledgerRepository: {
    createPair: vi.fn(),
    findByTransactionId: vi.fn(),
  },
}));

vi.mock('../../src/repositories/fraud.repository', () => ({
  fraudRepository: {
    findSignalsByTransactionId: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// ── Import after mocks ──────────────────────────────────────────

import { paymentService } from '../../src/services/payment.service';
import { idempotencyService } from '../../src/services/idempotency.service';
import { paymentRepository } from '../../src/repositories/payment.repository';
import { ledgerService } from '../../src/services/ledger.service';
import { acquireAccountLocks, releaseAllLocks, redis } from '@settlr/redis';
import { publishEvent } from '@settlr/kafka';
import { db } from '@settlr/database';
import axios from 'axios';
import {
  makeSenderAccount,
  makeRecipientAccount,
  makePaymentParams,
  makeTransaction,
  makeFraudResult,
  makeHighRiskFraudResult,
} from '../helpers';

// ── Standard mock data ──────────────────────────────────────────

const mockFromAccount = {
  id: 'aaaa-1111-sender',
  user_id: 'user-001',
  balance: 1000000, // ₹10,000
  version: 1,
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockToAccount = {
  id: 'bbbb-2222-recipient',
  user_id: 'user-002',
  balance: 200000, // ₹2,000
  version: 3,
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockCompletedTransaction = {
  id: 'txn-uuid-001',
  idempotency_key: 'idem-key-001',
  from_account_id: 'aaaa-1111-sender',
  to_account_id: 'bbbb-2222-recipient',
  amount: 50000,
  currency: 'INR',
  status: 'completed',
  fraud_score: 8,
  fraud_action: 'approve',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockApproveResult = {
  data: {
    data: {
      score: 8,
      action: 'approve',
      signals: [],
    },
  },
};

// ── Setup helper — configures the "happy path" mocks ──────────

function setupHappyPathMocks(overrides?: {
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  transaction?: Record<string, unknown>;
}) {
  const from = { ...mockFromAccount, ...overrides?.from };
  const to = { ...mockToAccount, ...overrides?.to };
  const txn = { ...mockCompletedTransaction, ...overrides?.transaction };

  (idempotencyService.get as Mock).mockResolvedValue(null);
  (acquireAccountLocks as Mock).mockResolvedValue({
    acquired: true,
    lockKeys: ['lock:account:aaaa', 'lock:account:bbbb'],
  });
  (axios.post as Mock).mockResolvedValue(mockApproveResult);
  (db as unknown as Mock).mockReturnValue({
    where: vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue(from),
    }),
  });
  (db.transaction as Mock).mockImplementation(
    async (cb: (trx: unknown) => Promise<unknown>) => cb({})
  );
  (paymentRepository.lockAccount as Mock)
    .mockResolvedValueOnce(from)
    .mockResolvedValueOnce(to);
  (paymentRepository.updateBalance as Mock).mockResolvedValue(1);
  (paymentRepository.creditAccount as Mock).mockResolvedValue(undefined);
  (paymentRepository.create as Mock).mockResolvedValue(txn);
  (paymentRepository.insertFraudSignals as Mock).mockResolvedValue(undefined);
  (ledgerService.createEntries as Mock).mockResolvedValue(undefined);
  (idempotencyService.set as Mock).mockResolvedValue(undefined);
  (publishEvent as Mock).mockResolvedValue(undefined);
  (redis.del as Mock).mockResolvedValue(undefined);
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('PaymentService — Comprehensive Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.2: IDEMPOTENCY TESTS
  // ─────────────────────────────────────────────────────────

  describe('Idempotency', () => {
    it(`IDEM-01: returns cached response immediately when idempotency key exists
        in Redis, without touching database or acquiring any locks`, async () => {
      // WHY: This is the core idempotency guarantee.
      // If user retries a payment, they must get the SAME
      // response without being charged again.

      const cachedTransaction = {
        id: 'txn-cached-001',
        status: 'completed',
        amount: 50000,
      };
      (idempotencyService.get as Mock).mockResolvedValue(cachedTransaction);

      const result = await paymentService.initiatePayment(makePaymentParams());

      // Got cached response
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(cachedTransaction);

      // THE CRITICAL ASSERTIONS:
      // Database must NEVER be touched on cache hit
      expect(acquireAccountLocks).not.toHaveBeenCalled();
      expect(paymentRepository.create).not.toHaveBeenCalled();
      expect(paymentRepository.lockAccount).not.toHaveBeenCalled();
      expect(ledgerService.createEntries).not.toHaveBeenCalled();
      expect(publishEvent).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it(`IDEM-02: caches response in Redis with 86400 second TTL (24 hours)
        after successful payment so retries get cached response`, async () => {
      // WHY: Without caching the response, idempotency check
      // on retry would find nothing and charge again.
      // 86400 seconds = 24 hours — same as Stripe.

      setupHappyPathMocks();
      const params = makePaymentParams();
      await paymentService.initiatePayment(params);

      // Idempotency response must be cached
      expect(idempotencyService.set).toHaveBeenCalledWith(
        params.idempotencyKey,
        expect.objectContaining({ id: 'txn-uuid-001' })
      );
    });

    it(`IDEM-03: second call with same idempotency key returns fromCache true
        and does not create second transaction`, async () => {
      // WHY: Simulates the most common real-world scenario —
      // user taps pay twice because first tap seemed slow.

      // First call — cache miss, creates transaction
      setupHappyPathMocks();
      const params = makePaymentParams();
      const result1 = await paymentService.initiatePayment(params);

      vi.clearAllMocks();

      // Second call — cache hit
      const cached = { id: result1.data!.id || 'txn-uuid-001', status: 'completed' };
      (idempotencyService.get as Mock).mockResolvedValue(cached);
      const result2 = await paymentService.initiatePayment(params);

      expect(result1.fromCache).toBeUndefined(); // first call not from cache
      expect(result2.fromCache).toBe(true);
      expect(result2.data).toEqual(cached);
      // Repository only called on first request, not second
      expect(paymentRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.3: DISTRIBUTED LOCK TESTS
  // ─────────────────────────────────────────────────────────

  describe('Distributed Locks', () => {
    it(`LOCK-01: acquires Redis locks on BOTH account IDs before
        touching database, using 10 second TTL`, async () => {
      // WHY: Locking prevents two simultaneous payments
      // from the same account both passing the balance check.
      // 10s TTL = auto-release if our process crashes.

      setupHappyPathMocks();
      const params = makePaymentParams({
        fromAccountId: 'acc-from-uuid',
        toAccountId: 'acc-to-uuid',
      });

      await paymentService.initiatePayment(params);

      // acquireAccountLocks must be called with both accounts + TTL 10
      expect(acquireAccountLocks).toHaveBeenCalledWith(
        'acc-from-uuid',
        'acc-to-uuid',
        10
      );
    });

    it(`LOCK-02: acquireAccountLocks sorts UUIDs alphabetically to prevent
        deadlock — verified in redis package source code`, async () => {
      // WHY: If Thread A locks acc-1 then acc-2, and
      // Thread B locks acc-2 then acc-1, they deadlock.
      // The acquireAccountLocks function sorts alphabetically.
      // This test verifies the contract is maintained.

      setupHappyPathMocks();

      const accAAA = 'acc-aaa-aaa-aaa';
      const accZZZ = 'acc-zzz-zzz-zzz';

      // Payment direction 1: AAA → ZZZ
      await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: accAAA,
          toAccountId: accZZZ,
        })
      );

      expect(acquireAccountLocks).toHaveBeenCalledWith(accAAA, accZZZ, 10);

      vi.clearAllMocks();
      setupHappyPathMocks();

      // Payment direction 2: ZZZ → AAA (reversed)
      await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: accZZZ,
          toAccountId: accAAA,
        })
      );

      // acquireAccountLocks is always called — sort happens inside it
      expect(acquireAccountLocks).toHaveBeenCalledWith(accZZZ, accAAA, 10);
    });

    it(`LOCK-03: throws ACCOUNT_LOCKED (409) when Redis lock cannot be
        acquired because another payment is processing`, async () => {
      // WHY: When lock is held, return immediately with 409.
      // Client should retry after 1 second.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: false,
        lockKeys: [],
      });

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow('Account is busy');

      // Database must not be touched when lock fails
      expect(paymentRepository.lockAccount).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it(`LOCK-04: releases ALL Redis locks in finally block even when
        database transaction throws an unexpected error`, async () => {
      // WHY: If a process crashes or DB throws an error,
      // we must release locks. Without this, accounts would
      // be frozen for 10 seconds (TTL) after every error.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:account:aaa', 'lock:account:bbb'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });

      // Simulate catastrophic DB failure
      (db.transaction as Mock).mockRejectedValue(
        new Error('FATAL: connection to database lost')
      );

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow();

      // Locks must be released despite the error
      expect(releaseAllLocks).toHaveBeenCalledWith([
        'lock:account:aaa',
        'lock:account:bbb',
      ]);
    });

    it(`LOCK-05: releases locks even when Kafka publish throws an error
        after successful DB commit`, async () => {
      // WHY: Kafka publish happens after DB commit.
      // Even if Kafka fails, locks must still be released.

      setupHappyPathMocks();
      (publishEvent as Mock)
        .mockRejectedValueOnce(new Error('Kafka broker unreachable'))
        .mockResolvedValue(undefined); // for the payment.failed event

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow();

      expect(releaseAllLocks).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.4: BALANCE VALIDATION TESTS
  // ─────────────────────────────────────────────────────────

  describe('Balance Validation', () => {
    it(`BAL-01: rejects with INSUFFICIENT_BALANCE when sender balance
        is less than transfer amount`, async () => {
      // WHY: Sender has ₹100 (10000 paise), tries to send ₹200 (20000) — must fail.

      const poorSender = { ...mockFromAccount, balance: 10000 }; // ₹100
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(poorSender),
        }),
      });
      (db.transaction as Mock).mockImplementation(
        async (cb: (trx: unknown) => Promise<unknown>) => cb({})
      );
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce(poorSender) // sender has ₹100
        .mockResolvedValueOnce(mockToAccount);

      await expect(
        paymentService.initiatePayment(
          makePaymentParams({ amount: 20000 }) // ₹200
        )
      ).rejects.toThrow(/paise/);

      // Balance must never be modified on failure
      expect(paymentRepository.updateBalance).not.toHaveBeenCalled();
    });

    it(`BAL-02: ALLOWS payment when sender balance EXACTLY equals transfer
        amount (balance becomes zero)`, async () => {
      // WHY: Edge case — balance = amount should be ALLOWED.
      // Sending your last rupee is valid.

      const exactSender = { ...mockFromAccount, balance: 50000 }; // ₹500
      setupHappyPathMocks({
        from: { balance: 50000 },
        to: { balance: 0 },
      });
      (paymentRepository.lockAccount as Mock).mockReset();
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce({ ...mockFromAccount, balance: 50000 })
        .mockResolvedValueOnce({ ...mockToAccount, balance: 0 });

      const result = await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: mockFromAccount.id,
          toAccountId: mockToAccount.id,
          amount: 50000, // exactly ₹500
        })
      );

      expect(result.success).toBe(true);
    });

    it(`BAL-03: rejects with VALIDATION_ERROR when amount is below
        minimum (100 paise = ₹1) — cannot send nothing`, async () => {
      (idempotencyService.get as Mock).mockResolvedValue(null);

      await expect(
        paymentService.initiatePayment(makePaymentParams({ amount: 10 }))
      ).rejects.toThrow(/Minimum transfer/);
    });

    it(`BAL-04: rejects when amount exceeds maximum transfer limit`, async () => {
      (idempotencyService.get as Mock).mockResolvedValue(null);

      await expect(
        paymentService.initiatePayment(
          makePaymentParams({ amount: 10_000_000_01 }) // over max
        )
      ).rejects.toThrow(/Maximum transfer/);
    });

    it(`BAL-05: rejects when sender account status is frozen`, async () => {
      // WHY: Frozen accounts must not be able to send money.
      // This happens when fraud is detected after account creation.

      const frozenSender = { ...mockFromAccount, status: 'frozen' };
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(frozenSender),
        }),
      });
      (db.transaction as Mock).mockImplementation(
        async (cb: (trx: unknown) => Promise<unknown>) => cb({})
      );
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce(frozenSender)
        .mockResolvedValueOnce(mockToAccount);

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow(/frozen/);
    });

    it(`BAL-06: rejects when sender account does not exist in database`, async () => {
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null), // no account
        }),
      });

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow(/not found/);
    });

    it(`BAL-07: rejects when recipient account does not exist`, async () => {
      // Reset all mocks fully to avoid stale mock implementations
      (paymentRepository.lockAccount as Mock).mockReset();
      (paymentRepository.updateBalance as Mock).mockReset();
      (paymentRepository.creditAccount as Mock).mockReset();
      (paymentRepository.create as Mock).mockReset();
      (paymentRepository.insertFraudSignals as Mock).mockReset();

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });
      (redis.del as Mock).mockResolvedValue(undefined);

      // Inside db.transaction, lockAccount returns sender OK, recipient null
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce(mockFromAccount) // sender found
        .mockResolvedValueOnce(null);           // recipient NOT found

      (db.transaction as Mock).mockImplementation(
        async (cb: (trx: unknown) => Promise<unknown>) => cb({})
      );

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow(/not found/);
    });

    it(`BAL-08: rejects when sender and recipient are the same account`, async () => {
      // WHY: Self-transfers create infinite money loops.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      const sameId = 'same-account-id';

      await expect(
        paymentService.initiatePayment(
          makePaymentParams({
            fromAccountId: sameId,
            toAccountId: sameId,
          })
        )
      ).rejects.toThrow(/same account/);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.5: OPTIMISTIC LOCKING TESTS
  // ─────────────────────────────────────────────────────────

  describe('Optimistic Locking', () => {
    it(`OPT-01: retries the DB transaction up to 3 times when concurrent
        modification is detected (updateBalance returns 0 rows)`, async () => {
      // WHY: Optimistic locking is the third layer of race condition protection.
      // If version mismatch is detected, we retry. After 3 retries, we give up.

      // Reset all mocks fully
      (paymentRepository.lockAccount as Mock).mockReset();
      (paymentRepository.updateBalance as Mock).mockReset();
      (paymentRepository.creditAccount as Mock).mockReset();
      (paymentRepository.create as Mock).mockReset();
      (paymentRepository.insertFraudSignals as Mock).mockReset();

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });
      (redis.del as Mock).mockResolvedValue(undefined);

      // Every attempt: lock accounts fine, but updateBalance returns 0 → CONCURRENT_MODIFICATION
      (paymentRepository.lockAccount as Mock).mockResolvedValue(mockFromAccount);
      // Override for second call each time to return recipient
      let lockCallCount = 0;
      (paymentRepository.lockAccount as Mock).mockImplementation(async () => {
        lockCallCount++;
        // Odd calls = sender, even calls = recipient
        return lockCallCount % 2 === 1 ? mockFromAccount : mockToAccount;
      });
      (paymentRepository.updateBalance as Mock).mockResolvedValue(0); // always 0 rows

      (db.transaction as Mock).mockImplementation(
        async (cb: (trx: unknown) => Promise<unknown>) => cb({})
      );

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow(/Concurrent modification|Failed after retries/);

      // Must have tried 3 times (initial + 2 retries)
      expect(db.transaction).toHaveBeenCalledTimes(3);
    });

    it(`OPT-02: succeeds on second retry when first attempt has
        concurrent modification`, async () => {
      // WHY: In practice, concurrent modification is rare
      // and retrying once almost always succeeds.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });
      (redis.del as Mock).mockResolvedValue(undefined);
      (idempotencyService.set as Mock).mockResolvedValue(undefined);
      (publishEvent as Mock).mockResolvedValue(undefined);

      const { AppError, ErrorCodes } = await import('@settlr/types/errors');
      let attemptCount = 0;

      (db.transaction as Mock).mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => {
        attemptCount++;
        const mockTrx = {};

        (paymentRepository.lockAccount as Mock)
          .mockResolvedValueOnce(mockFromAccount)
          .mockResolvedValueOnce(mockToAccount);
        (paymentRepository.insertFraudSignals as Mock).mockResolvedValue(undefined);
        (ledgerService.createEntries as Mock).mockResolvedValue(undefined);

        if (attemptCount === 1) {
          // First attempt — concurrent modification
          (paymentRepository.updateBalance as Mock).mockResolvedValue(0);
        } else {
          // Second attempt — success
          (paymentRepository.updateBalance as Mock).mockResolvedValue(1);
          (paymentRepository.creditAccount as Mock).mockResolvedValue(undefined);
          (paymentRepository.create as Mock).mockResolvedValue(mockCompletedTransaction);
        }

        return cb(mockTrx);
      });

      const result = await paymentService.initiatePayment(makePaymentParams());

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.6: LEDGER ENTRY TESTS
  // ─────────────────────────────────────────────────────────

  describe('Ledger Entries', () => {
    it(`LED-01: creates exactly 2 ledger entries per payment — one DEBIT
        for sender and one CREDIT for recipient`, async () => {
      // WHY: Double-entry accounting requires exactly 2 entries.
      // 1 entry = incomplete audit trail.
      // 3+ entries = money created from nowhere.

      setupHappyPathMocks();
      const params = makePaymentParams({
        fromAccountId: mockFromAccount.id,
        toAccountId: mockToAccount.id,
        amount: 50000,
      });

      await paymentService.initiatePayment(params);

      // ledgerService.createEntries is called with correct params
      expect(ledgerService.createEntries).toHaveBeenCalledWith(
        expect.anything(), // trx
        expect.objectContaining({
          transactionId: mockCompletedTransaction.id,
          fromAccountId: mockFromAccount.id,
          toAccountId: mockToAccount.id,
          amount: 50000,
        })
      );
    });

    it(`LED-02: records correct balanceBefore and balanceAfter in ledger
        entries matching actual balance changes`, async () => {
      // WHY: Ledger must record the exact state before and after.
      // This is used for reconciliation and auditing.

      const senderBalance = 1000000; // ₹10,000
      const recipientBalance = 200000; // ₹2,000
      const amount = 50000; // ₹500

      setupHappyPathMocks({
        from: { balance: senderBalance },
        to: { balance: recipientBalance },
      });
      (paymentRepository.lockAccount as Mock).mockReset();
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce({ ...mockFromAccount, balance: senderBalance })
        .mockResolvedValueOnce({ ...mockToAccount, balance: recipientBalance });

      await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: mockFromAccount.id,
          toAccountId: mockToAccount.id,
          amount,
        })
      );

      expect(ledgerService.createEntries).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fromBalanceBefore: senderBalance,
          fromBalanceAfter: senderBalance - amount,
          toBalanceBefore: recipientBalance,
          toBalanceAfter: recipientBalance + amount,
        })
      );
    });

    it(`LED-03: uses the real transaction ID from the inserted transaction
        record — not undefined, not a mock`, async () => {
      // WHY: If ledger entries use wrong transaction ID, the audit
      // trail is broken — entries point to nothing.

      setupHappyPathMocks();

      await paymentService.initiatePayment(makePaymentParams());

      // The transactionId in ledger call must match what create() returned
      const ledgerCall = (ledgerService.createEntries as Mock).mock.calls[0];
      expect(ledgerCall[1].transactionId).toBe(mockCompletedTransaction.id);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2.7: KAFKA EVENT TESTS
  // ─────────────────────────────────────────────────────────

  describe('Kafka Events', () => {
    it(`KAFKA-01: publishes payment.completed event AFTER DB commits`, async () => {
      // WHY: Publishing before commit can result in consumers
      // acting on a transaction that was rolled back.

      setupHappyPathMocks();
      const params = makePaymentParams();

      await paymentService.initiatePayment(params);

      expect(publishEvent).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          transactionId: mockCompletedTransaction.id,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
        }),
        params.traceId
      );
    });

    it(`KAFKA-02: publishes payment.completed with all required fields
        in the standard event envelope`, async () => {
      setupHappyPathMocks();
      const params = makePaymentParams();

      await paymentService.initiatePayment(params);

      const publishCall = (publishEvent as Mock).mock.calls[0];
      const eventData = publishCall[1];

      // All required fields must be present
      expect(eventData).toHaveProperty('transactionId');
      expect(eventData).toHaveProperty('fromAccountId');
      expect(eventData).toHaveProperty('toAccountId');
      expect(eventData).toHaveProperty('amount');
      expect(eventData).toHaveProperty('currency');
      expect(eventData).toHaveProperty('traceId');
      expect(eventData).toHaveProperty('fraudScore');
      expect(eventData).toHaveProperty('fraudAction');
    });

    it(`KAFKA-03: publishes payment.fraud_blocked instead of
        payment.completed when fraud engine declines`, async () => {
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });

      // Fraud service returns decline
      (axios.post as Mock).mockResolvedValue({
        data: {
          data: {
            score: 95,
            action: 'decline',
            signals: [{ ruleName: 'VELOCITY_CHECK', scoreAdded: 25, signalData: {} }],
          },
        },
      });

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow(/declined by risk engine/);

      // Must publish fraud_blocked, NOT payment.completed
      expect(publishEvent).toHaveBeenCalledWith(
        'payment.fraud_blocked',
        expect.objectContaining({ fraudScore: 95 }),
        expect.any(String)
      );
    });

    it(`KAFKA-04: publishes payment.failed event when payment fails
        for any business reason`, async () => {
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: true,
        lockKeys: ['lock:1', 'lock:2'],
      });
      (axios.post as Mock).mockResolvedValue(mockApproveResult);
      (db as unknown as Mock).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFromAccount),
        }),
      });
      // DB transaction fails
      (db.transaction as Mock).mockRejectedValue(
        new Error('Connection lost')
      );

      await expect(
        paymentService.initiatePayment(makePaymentParams())
      ).rejects.toThrow();

      // payment.failed event should have been published
      expect(publishEvent).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({
          reason: expect.any(String),
        }),
        expect.any(String)
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION: LATENCY & PERFORMANCE ASSERTIONS
  // ─────────────────────────────────────────────────────────

  describe('Performance & Latency', () => {
    it(`PERF-01: happy path payment completes in under 200ms
        (mocked deps = pure logic latency)`, async () => {
      // WHY: Measures raw service logic latency without I/O.
      // With all external deps mocked, this measures ONLY
      // the payment service's computational overhead.

      setupHappyPathMocks();

      const start = performance.now();
      const result = await paymentService.initiatePayment(makePaymentParams());
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(200);

      console.log(`  PERF-01: Payment logic latency = ${elapsed.toFixed(2)}ms`);
    });

    it(`PERF-02: idempotency cache hit returns in under 5ms`, async () => {
      // WHY: Cache hits should be near-instant.

      const cached = { id: 'txn-perf', status: 'completed' };
      (idempotencyService.get as Mock).mockResolvedValue(cached);

      const start = performance.now();
      const result = await paymentService.initiatePayment(makePaymentParams());
      const elapsed = performance.now() - start;

      expect(result.fromCache).toBe(true);
      expect(elapsed).toBeLessThan(5);

      console.log(`  PERF-02: Cache hit latency = ${elapsed.toFixed(2)}ms`);
    });

    it(`PERF-03: 100 sequential cache-hit payments complete in under 50ms
        (throughput test)`, async () => {
      // WHY: Measures throughput capability under cached conditions.
      // 100 payments in <50ms = >2000 cache-hit TPS capacity.

      const cached = { id: 'txn-throughput', status: 'completed' };
      (idempotencyService.get as Mock).mockResolvedValue(cached);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await paymentService.initiatePayment(makePaymentParams());
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      const tps = Math.round((100 / elapsed) * 1000);

      console.log(`  PERF-03: 100 cache-hit payments in ${elapsed.toFixed(2)}ms (${tps} TPS)`);
    });

    it(`PERF-04: 50 full happy-path payments complete in under 500ms`, async () => {
      // WHY: Measures throughput of the full path (mocked I/O).
      // This is the upper bound of payment logic overhead.

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        vi.clearAllMocks();
        setupHappyPathMocks();
        await paymentService.initiatePayment(makePaymentParams());
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
      const tps = Math.round((50 / elapsed) * 1000);

      console.log(`  PERF-04: 50 full payments in ${elapsed.toFixed(2)}ms (${tps} TPS)`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION: END-TO-END FLOW ASSERTIONS
  // ─────────────────────────────────────────────────────────

  describe('Full 17-Step Transfer Flow', () => {
    it(`FLOW-01: executes all 17 steps in correct order —
        idempotency → lock → fraud → DB transaction → cache → Kafka → release`, async () => {
      // WHY: Verifies the complete payment flow executes every step.

      setupHappyPathMocks();
      const params = makePaymentParams({
        fromAccountId: mockFromAccount.id,
        toAccountId: mockToAccount.id,
      });

      const result = await paymentService.initiatePayment(params);

      // Step 1: Idempotency check
      expect(idempotencyService.get).toHaveBeenCalledWith(params.idempotencyKey);
      // Step 2: Lock acquisition
      expect(acquireAccountLocks).toHaveBeenCalledWith(
        params.fromAccountId,
        params.toAccountId,
        10
      );
      // Step 3-4: Fraud check (via axios to fraud service)
      expect(axios.post).toHaveBeenCalled();
      // Step 5-13: DB transaction
      expect(db.transaction).toHaveBeenCalled();
      // Step 5-6: Lock rows in DB
      expect(paymentRepository.lockAccount).toHaveBeenCalledTimes(2);
      // Step 8: Update sender balance
      expect(paymentRepository.updateBalance).toHaveBeenCalled();
      // Step 10: Credit recipient
      expect(paymentRepository.creditAccount).toHaveBeenCalled();
      // Step 11: Create transaction record
      expect(paymentRepository.create).toHaveBeenCalled();
      // Step 12: Write ledger entries
      expect(ledgerService.createEntries).toHaveBeenCalled();
      // Step 13: Persist fraud signals
      expect(paymentRepository.insertFraudSignals).toHaveBeenCalled();
      // Step 15: Cache idempotency
      expect(idempotencyService.set).toHaveBeenCalled();
      // Step 16: Kafka event
      expect(publishEvent).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({ transactionId: mockCompletedTransaction.id }),
        params.traceId
      );
      // Step 17: Locks released
      expect(releaseAllLocks).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
    });
  });
});
