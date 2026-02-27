Read both attached files completely — SETTLR_COPILOT.md and
SETTLR_UI_COPILOT.md before writing a single line of test code.
Do not write any code until you have confirmed you read both files.

═══════════════════════════════════════════════════════════════
SETTLR — COMPLETE TESTING INSTRUCTIONS FOR GITHUB COPILOT
WHAT TO TEST, HOW TO TEST IT, AND WHY EACH TEST EXISTS
═══════════════════════════════════════════════════════════════

This is the complete testing guide for the Settlr project.
Every test in this document must be written exactly as described.
Every test has a comment explaining WHY it exists.
Every test must pass before moving to the next one.

I am learning as I go so after writing each test file,
explain in simple words what the tests proved and why
that matters for a payment system.

═══════════════════════════════════════════════════════════════
PART 1 — SETUP EVERYTHING BEFORE WRITING ANY TESTS
═══════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────
STEP 1.1 — INSTALL ALL TESTING DEPENDENCIES
────────────────────────────────────────────────────────────────

Run these commands exactly:

  npm install -D vitest @vitest/coverage-v8 @vitest/ui
  npm install -D supertest @types/supertest
  npm install -D msw
  npm install    k6

Add these scripts to every service package.json:

  "scripts": {
    "test":                "vitest run",
    "test:watch":          "vitest",
    "test:ui":             "vitest --ui",
    "test:coverage":       "vitest run --coverage",
    "test:unit":           "vitest run tests/unit",
    "test:integration":    "vitest run tests/integration",
    "test:unit:coverage":  "vitest run --coverage tests/unit"
  }

────────────────────────────────────────────────────────────────
STEP 1.2 — CREATE vitest.config.ts IN EVERY SERVICE
────────────────────────────────────────────────────────────────

Create this file at services/{service-name}/vitest.config.ts:

  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      testTimeout: 30000,
      hookTimeout: 60000,

      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage',

        // CI fails if any threshold is not met
        thresholds: {
          lines:      80,
          functions:  80,
          branches:   75,
          statements: 80,
        },

        // Never count test files in coverage
        exclude: [
          'node_modules/**',
          'tests/**',
          '**/*.test.ts',
          '**/index.ts',
          '**/types/**',
        ],
      },

      // Different configs for unit vs integration
      // Run: vitest run tests/unit OR tests/integration
      include: ['tests/**/*.test.ts'],
    },
  });

────────────────────────────────────────────────────────────────
STEP 1.3 — CREATE THE SHARED TEST HELPER FILE
────────────────────────────────────────────────────────────────

Create: services/payment-service/tests/helpers.ts

  // This file contains shared utilities used across all tests.
  // It creates fake data that looks real so our tests are
  // meaningful. All amounts are in paise (integer).

  import { randomUUID } from 'crypto';

  // Creates a fake sender account with ₹10,000 balance
  export function makeSenderAccount(overrides = {}) {
    return {
      id:        randomUUID(),
      userId:    randomUUID(),
      balance:   1000000,          // ₹10,000 in paise
      currency:  'INR',
      status:    'active',
      version:   0,
      createdAt: new Date('2025-01-01T00:00:00Z'), // old account
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      ...overrides,
    };
  }

  // Creates a fake recipient account with ₹0 balance
  export function makeRecipientAccount(overrides = {}) {
    return {
      id:        randomUUID(),
      userId:    randomUUID(),
      balance:   0,
      currency:  'INR',
      status:    'active',
      version:   0,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      ...overrides,
    };
  }

  // Creates fake payment parameters
  export function makePaymentParams(overrides = {}) {
    return {
      idempotencyKey: randomUUID(),
      fromAccountId:  randomUUID(),
      toAccountId:    randomUUID(),
      amount:         20000,       // ₹200 in paise
      currency:       'INR',
      description:    'test payment',
      userId:         randomUUID(),
      traceId:        randomUUID(),
      ...overrides,
    };
  }

  // Creates a fake completed transaction
  export function makeTransaction(overrides = {}) {
    return {
      id:              randomUUID(),
      idempotencyKey:  randomUUID(),
      fromAccountId:   randomUUID(),
      toAccountId:     randomUUID(),
      amount:          20000,
      currency:        'INR',
      status:          'completed',
      fraudScore:      12,
      fraudAction:     'approve',
      description:     'test',
      createdAt:       new Date(),
      updatedAt:       new Date(),
      ...overrides,
    };
  }

  // Creates a fake fraud result (low risk, approve)
  export function makeFraudResult(overrides = {}) {
    return {
      score:   12,
      action:  'approve',
      signals: [],
      ...overrides,
    };
  }

  // Creates a fake high-risk fraud result (decline)
  export function makeHighRiskFraudResult() {
    return {
      score:  85,
      action: 'decline',
      signals: [
        { ruleName: 'VELOCITY_CHECK',  scoreAdded: 25,
          data: { transactionsInLastMinute: 5 } },
        { ruleName: 'AMOUNT_ANOMALY',  scoreAdded: 30,
          data: { amount: 500000, averageAmount: 10000 } },
        { ruleName: 'RECIPIENT_RISK',  scoreAdded: 20,
          data: { uniqueSendersInLastHour: 12 } },
        { ruleName: 'UNUSUAL_HOUR',    scoreAdded: 10,
          data: { hour: 3 } },
      ],
    };
  }

  // Waits for a condition to be true (useful in concurrent tests)
  export function waitFor(
    condition: () => boolean,
    timeoutMs: number = 5000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('waitFor timed out'));
      }, timeoutMs);
    });
  }

────────────────────────────────────────────────────────────────
STEP 1.4 — CREATE INTEGRATION TEST DATABASE SETUP
────────────────────────────────────────────────────────────────

Create: tests/integration/setup.ts

  // This file sets up a clean database before each
  // integration test. We use a REAL test database —
  // never the production database, never mocks.
  // Integration tests are slower but they catch bugs
  // that unit tests cannot — like wrong SQL queries
  // or missing database indexes.

  import { db }    from '@settlr/database';
  import { redis } from '@settlr/redis';
  import bcrypt    from 'bcrypt';
  import { randomUUID } from 'crypto';

  // Wipes all data from test tables in correct order.
  // Order matters because of foreign key constraints.
  // For example: ledger_entries references transactions,
  // so ledger_entries must be deleted first.
  export async function cleanDatabase(): Promise<void> {
    await db('webhook_deliveries').delete();
    await db('webhook_endpoints').delete();
    await db('fraud_signals').delete();
    await db('ledger_entries').delete();
    await db('transactions').delete();
    await db('accounts').delete();
    await db('users').delete();
  }

  // Cleans all Redis test keys.
  // We prefix test keys with 'test:' to separate them.
  export async function cleanRedis(): Promise<void> {
    const testKeys = await redis.keys('test:*');
    const lockKeys = await redis.keys('lock:*');
    const idemKeys = await redis.keys('idempotency:*');
    const fraudKeys= await redis.keys('fraud:*');
    const allKeys  = [
      ...testKeys, ...lockKeys,
      ...idemKeys, ...fraudKeys
    ];
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
  }

  // Creates a real user in the test database.
  // Returns the complete user object with all fields.
  export async function createTestUser(overrides = {}) {
    const [user] = await db('users').insert({
      id:           randomUUID(),
      email:        `test-${Date.now()}-${Math.random()}@settlr.dev`,
      name:         'Test User',
      password_hash: await bcrypt.hash('TestPass123!', 12),
      kyc_status:   'verified',
      is_active:    true,
      ...overrides,
    }).returning('*');
    return user;
  }

  // Creates a real account in the test database.
  // balancePaise: amount in paise. ₹10,000 = 1000000 paise.
  export async function createTestAccount(
    userId: string,
    balancePaise: number = 1000000
  ) {
    const [account] = await db('accounts').insert({
      id:       randomUUID(),
      user_id:  userId,
      balance:  balancePaise,
      currency: 'INR',
      status:   'active',
      version:  0,
    }).returning('*');
    return account;
  }

  // Reads current account balance directly from database.
  // Use this to verify balances after payments.
  export async function getAccountBalance(
    accountId: string
  ): Promise<number> {
    const account = await db('accounts')
      .where({ id: accountId })
      .first();
    return account.balance;
  }

  // Reads all ledger entries for a transaction.
  // Used to verify double-entry accounting.
  export async function getLedgerEntries(transactionId: string) {
    return db('ledger_entries')
      .where({ transaction_id: transactionId });
  }

  // Reads all fraud signals for a transaction.
  export async function getFraudSignals(transactionId: string) {
    return db('fraud_signals')
      .where({ transaction_id: transactionId });
  }

═══════════════════════════════════════════════════════════════
PART 2 — UNIT TESTS FOR PAYMENT SERVICE
"Test every piece of business logic in isolation"
═══════════════════════════════════════════════════════════════

Create: services/payment-service/tests/unit/payment.service.test.ts

Write every test below. Do not skip any.
After writing this file run: npm run test:unit
All tests must pass before moving forward.

────────────────────────────────────────────────────────────────
SECTION 2.1 — FILE HEADER AND MOCK SETUP
────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────
  // payment.service.test.ts
  //
  // WHY THESE TESTS EXIST:
  // The payment service contains the most critical business
  // logic in the entire application. A bug here means real
  // money is lost or duplicated. These unit tests verify
  // every branch, every error path, and every edge case
  // in complete isolation — no real database, no real Redis,
  // no real Kafka. Everything external is mocked so we test
  // ONLY the payment service logic.
  // ─────────────────────────────────────────────────────────

  import { describe, it, expect, beforeEach,
           afterEach, vi, type Mock } from 'vitest';
  import { randomUUID } from 'crypto';

  // Mock ALL external dependencies before importing
  // anything that uses them. This is critical — mocks
  // must be declared before imports in Vitest.
  vi.mock('../../repositories/payment.repository');
  vi.mock('../../repositories/account.repository');
  vi.mock('../../repositories/ledger.repository');
  vi.mock('../../services/idempotency.service');
  vi.mock('../../services/fraud.service');
  vi.mock('@settlr/redis');
  vi.mock('@settlr/kafka');
  vi.mock('@settlr/database');
  vi.mock('@settlr/logger');

  // Import after mocks
  import { paymentService }
    from '../../services/payment.service';
  import { accountRepository }
    from '../../repositories/account.repository';
  import { ledgerRepository }
    from '../../repositories/ledger.repository';
  import { transactionRepository }
    from '../../repositories/payment.repository';
  import { idempotencyService }
    from '../../services/idempotency.service';
  import { fraudService }
    from '../../services/fraud.service';
  import { redis }      from '@settlr/redis';
  import { kafka }      from '@settlr/kafka';
  import { db }         from '@settlr/database';
  import {
    makeSenderAccount,
    makeRecipientAccount,
    makePaymentParams,
    makeTransaction,
    makeFraudResult,
    makeHighRiskFraudResult,
  } from '../helpers';

────────────────────────────────────────────────────────────────
SECTION 2.2 — IDEMPOTENCY TESTS
────────────────────────────────────────────────────────────────

  // Write these tests inside describe('PaymentService', () => {

  describe('Idempotency', () => {

    it(`IDEM-01: returns cached response immediately when
        idempotency key exists in Redis, without touching
        database or acquiring any locks`, async () => {
      // WHY: This is the core idempotency guarantee.
      // If user retries a payment, they must get the SAME
      // response without being charged again. This test
      // proves the early return works correctly.

      // Arrange — simulate cache hit
      const cachedTransaction = makeTransaction();
      (idempotencyService.get as Mock)
        .mockResolvedValue(cachedTransaction);

      // Act
      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      // Assert — got cached response
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.data.id).toBe(cachedTransaction.id);

      // THE CRITICAL ASSERTIONS:
      // Database must NEVER be touched on cache hit
      expect(accountRepository.findById)
        .not.toHaveBeenCalled();
      expect(transactionRepository.create)
        .not.toHaveBeenCalled();
      expect(ledgerRepository.createEntries)
        .not.toHaveBeenCalled();

      // Redis locks must NEVER be acquired on cache hit
      const redisSetCalls = (redis.set as Mock).mock.calls;
      const lockCalls = redisSetCalls.filter(
        args => args[0].startsWith('lock:account:')
      );
      expect(lockCalls).toHaveLength(0);

      // Kafka must NEVER publish on cache hit
      expect(kafka.publish).not.toHaveBeenCalled();
    });

    it(`IDEM-02: stores response in Redis with 86400 second
        TTL after successful payment so retries get
        cached response`, async () => {
      // WHY: Without caching the response, idempotency check
      // on retry would find nothing and charge again.
      // 86400 seconds = 24 hours — same as Stripe.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      setupHappyPathMocks();

      const params = makePaymentParams();
      await paymentService.initiatePayment(params);

      // Idempotency response must be cached for 24 hours
      expect(idempotencyService.set).toHaveBeenCalledWith(
        params.idempotencyKey,
        expect.objectContaining({ status: 'completed' }),
        86400
      );
    });

    it(`IDEM-03: second call with same idempotency key
        returns fromCache true and does not create
        second transaction`, async () => {
      // WHY: Simulates the most common real-world scenario —
      // user taps pay twice because first tap seemed slow.

      const transaction = makeTransaction();

      // First call — cache miss, creates transaction
      (idempotencyService.get as Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(transaction); // second call hits

      setupHappyPathMocks();
      const params = makePaymentParams();

      const result1 = await paymentService
        .initiatePayment(params);
      const result2 = await paymentService
        .initiatePayment(params);

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
      expect(result2.data.id).toBe(result1.data.id);
      // Repository only called once, not twice
      expect(transactionRepository.create)
        .toHaveBeenCalledTimes(1);
    });

  });

────────────────────────────────────────────────────────────────
SECTION 2.3 — DISTRIBUTED LOCK TESTS
────────────────────────────────────────────────────────────────

  describe('Distributed Locks', () => {

    it(`LOCK-01: acquires Redis lock on BOTH account IDs
        before touching database, using NX flag and
        10 second TTL`, async () => {
      // WHY: Locking prevents two simultaneous payments
      // from the same account both passing the balance check.
      // NX = only set if Not eXists (atomic check-and-set).
      // 10s TTL = auto-release if our process crashes.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (redis.set as Mock).mockResolvedValue('OK');
      setupHappyPathMocks();

      const params = makePaymentParams({
        fromAccountId: 'acc-from-uuid',
        toAccountId:   'acc-to-uuid',
      });

      await paymentService.initiatePayment(params);

      // Find all Redis SET calls that are lock operations
      const lockCalls = (redis.set as Mock).mock.calls.filter(
        args => String(args[0]).startsWith('lock:account:')
      );

      // Must acquire exactly 2 locks — one per account
      expect(lockCalls).toHaveLength(2);

      // Every lock must use NX and EX 10 (10 second TTL)
      lockCalls.forEach(args => {
        expect(args).toContain('NX');
        expect(args).toContain('EX');
        // Find the TTL value — must be 10
        const exIndex = args.indexOf('EX');
        expect(args[exIndex + 1]).toBe(10);
      });
    });

    it(`LOCK-02: acquires locks in alphabetically sorted
        UUID order REGARDLESS of which account is sender
        and which is recipient — this prevents deadlock`, async () => {
      // WHY: If Thread A locks acc-1 then acc-2, and
      // Thread B locks acc-2 then acc-1, they deadlock.
      // Alphabetical sort means both threads always acquire
      // locks in the same order — deadlock impossible.
      // This is the same solution used in database
      // lock ordering theory.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (redis.set as Mock).mockResolvedValue('OK');
      setupHappyPathMocks();

      const accAAA = 'acc-aaa-aaa-aaa';
      const accZZZ = 'acc-zzz-zzz-zzz';

      // Payment direction 1: AAA → ZZZ
      await paymentService.initiatePayment(makePaymentParams({
        fromAccountId: accAAA,
        toAccountId:   accZZZ,
      }));
      const lockOrderForward = (redis.set as Mock).mock.calls
        .filter(a => String(a[0]).startsWith('lock:account:'))
        .map(a => a[0]);

      vi.clearAllMocks();
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (redis.set as Mock).mockResolvedValue('OK');
      setupHappyPathMocks();

      // Payment direction 2: ZZZ → AAA (reversed)
      await paymentService.initiatePayment(makePaymentParams({
        fromAccountId: accZZZ,
        toAccountId:   accAAA,
      }));
      const lockOrderReverse = (redis.set as Mock).mock.calls
        .filter(a => String(a[0]).startsWith('lock:account:'))
        .map(a => a[0]);

      // Lock order must be IDENTICAL in both directions
      // This proves deadlock is impossible
      expect(lockOrderForward).toEqual(lockOrderReverse);

      // First lock must always be the alphabetically smaller one
      expect(lockOrderForward[0])
        .toBe(`lock:account:${accAAA}`);
      expect(lockOrderForward[1])
        .toBe(`lock:account:${accZZZ}`);
    });

    it(`LOCK-03: returns 409 ACCOUNT_LOCKED when Redis lock
        cannot be acquired because another payment is
        already processing this account`, async () => {
      // WHY: When lock is held, return immediately with 409.
      // Client should retry after 1 second.
      // Never wait indefinitely for a lock.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      // First lock succeeds, second lock fails (already held)
      (redis.set as Mock)
        .mockResolvedValueOnce('OK')  // first lock acquired
        .mockResolvedValueOnce(null); // second lock fails

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACCOUNT_LOCKED');
      expect(result.statusCode).toBe(409);

      // Database must not be touched when lock fails
      expect(accountRepository.findById)
        .not.toHaveBeenCalled();
    });

    it(`LOCK-04: releases BOTH Redis locks in finally block
        even when database transaction throws an unexpected
        error — locks must never be stuck`, async () => {
      // WHY: If a process crashes or DB throws an error,
      // we must release locks. Without this, accounts would
      // be frozen for 10 seconds (TTL) after every error.
      // The finally block is the most important safety net.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (redis.set as Mock).mockResolvedValue('OK');

      // Simulate catastrophic DB failure
      (db.transaction as Mock).mockRejectedValue(
        new Error('FATAL: connection to database lost')
      );

      try {
        await paymentService.initiatePayment(makePaymentParams());
      } catch {
        // We expect an error — we are testing lock release
      }

      // Both locks must be released despite the error
      const delCalls = (redis.del as Mock).mock.calls.flat();
      const lockReleaseCalls = delCalls.filter(
        (k: string) => k.startsWith('lock:account:')
      );
      expect(lockReleaseCalls).toHaveLength(2);
    });

    it(`LOCK-05: releases locks even when Kafka publish
        throws an error after successful DB commit`, async () => {
      // WHY: Kafka publish happens after DB commit.
      // Even if Kafka fails, locks must still be released.

      (idempotencyService.get as Mock).mockResolvedValue(null);
      (redis.set as Mock).mockResolvedValue('OK');
      setupHappyPathMocks();
      (kafka.publish as Mock).mockRejectedValue(
        new Error('Kafka broker unreachable')
      );

      try {
        await paymentService.initiatePayment(makePaymentParams());
      } catch { /* expected */ }

      const delCalls = (redis.del as Mock).mock.calls.flat();
      expect(
        delCalls.filter((k: string) =>
          k.startsWith('lock:account:')
        )
      ).toHaveLength(2);
    });

  });

────────────────────────────────────────────────────────────────
SECTION 2.4 — BALANCE VALIDATION TESTS
────────────────────────────────────────────────────────────────

  describe('Balance Validation', () => {

    it(`BAL-01: rejects with INSUFFICIENT_BALANCE when
        sender balance is less than transfer amount`, async () => {
      // WHY: Most obvious financial validation.
      // Sender has ₹100, tries to send ₹200 — must fail.

      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValue(makeSenderAccount({
          balance: 10000 // only ₹100
        }));

      const result = await paymentService.initiatePayment(
        makePaymentParams({ amount: 20000 }) // ₹200
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_BALANCE');
      expect(result.statusCode).toBe(422);

      // Balance must never be modified on failure
      expect(accountRepository.updateBalance)
        .not.toHaveBeenCalled();
    });

    it(`BAL-02: ALLOWS payment when sender balance EXACTLY
        equals transfer amount (balance becomes zero)`, async () => {
      // WHY: Edge case — balance = amount should be ALLOWED.
      // This is a boundary condition that off-by-one errors
      // get wrong. Sending your last rupee is valid.

      setupLocksAndCache();
      const sender = makeSenderAccount({ balance: 20000 });
      const recipient = makeRecipientAccount();
      (accountRepository.findById as Mock)
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(recipient);
      setupDbTransaction();

      const result = await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: sender.id,
          toAccountId:   recipient.id,
          amount:        20000, // exactly equal to balance
        })
      );

      // Should succeed — zero balance is valid
      expect(result.success).toBe(true);
    });

    it(`BAL-03: rejects with INVALID_AMOUNT when amount
        is zero — cannot send nothing`, async () => {
      setupLocksAndCache();

      const result = await paymentService.initiatePayment(
        makePaymentParams({ amount: 0 })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_AMOUNT');
      expect(result.statusCode).toBe(400);
    });

    it(`BAL-04: rejects with INVALID_AMOUNT when amount
        is negative — cannot send negative money`, async () => {
      setupLocksAndCache();

      const result = await paymentService.initiatePayment(
        makePaymentParams({ amount: -5000 })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_AMOUNT');
    });

    it(`BAL-05: rejects with ACCOUNT_FROZEN when sender
        account status is frozen`, async () => {
      // WHY: Frozen accounts must not be able to send money.
      // This happens when fraud is detected after account creation.

      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValue(makeSenderAccount({
          status: 'frozen'
        }));

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACCOUNT_FROZEN');
      expect(result.statusCode).toBe(422);
    });

    it(`BAL-06: rejects with ACCOUNT_NOT_FOUND when sender
        account does not exist in database`, async () => {
      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValue(null); // account missing

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACCOUNT_NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it(`BAL-07: rejects with RECIPIENT_NOT_FOUND when
        recipient account does not exist`, async () => {
      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValueOnce(makeSenderAccount()) // sender ok
        .mockResolvedValueOnce(null);               // recipient missing

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('RECIPIENT_NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

  });

────────────────────────────────────────────────────────────────
SECTION 2.5 — OPTIMISTIC LOCKING TESTS
────────────────────────────────────────────────────────────────

  describe('Optimistic Locking', () => {

    it(`OPT-01: retries the entire DB transaction up to
        3 times when UPDATE returns 0 rows (concurrent
        modification detected)`, async () => {
      // WHY: Optimistic locking is the third layer of
      // race condition protection. If version mismatch
      // is detected (rowsUpdated = 0), we retry.
      // After 3 retries, we give up and return 409.
      // This tests that retry logic works correctly.

      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValue(makeSenderAccount());

      // Simulate: UPDATE WHERE version = X → 0 rows updated
      // This happens when another transaction modifies the
      // account between our SELECT and our UPDATE
      (db.transaction as Mock).mockImplementation(async () => {
        throw new Error('CONCURRENT_MODIFICATION');
      });

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONCURRENT_MODIFICATION');

      // Must have tried exactly 3 times before giving up
      expect(db.transaction).toHaveBeenCalledTimes(3);
    });

    it(`OPT-02: succeeds on second retry when first attempt
        has concurrent modification`, async () => {
      // WHY: In practice, concurrent modification is rare
      // and retrying once almost always succeeds.
      // This proves retry recovery works.

      setupLocksAndCache();
      const mockTrxResult = makeTransaction();

      let attemptCount = 0;
      (db.transaction as Mock).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('CONCURRENT_MODIFICATION');
        }
        return mockTrxResult; // succeeds on second try
      });

      const result = await paymentService.initiatePayment(
        makePaymentParams()
      );

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalledTimes(2);
    });

  });

────────────────────────────────────────────────────────────────
SECTION 2.6 — LEDGER ENTRY TESTS
────────────────────────────────────────────────────────────────

  describe('Ledger Entries', () => {

    it(`LED-01: creates EXACTLY 2 ledger entries per payment:
        one DEBIT for sender and one CREDIT for recipient,
        never more, never fewer`, async () => {
      // WHY: Double-entry accounting requires exactly 2 entries.
      // 1 entry = incomplete audit trail.
      // 3+ entries = money created from nowhere.
      // This is the most fundamental financial invariant.

      setupHappyPathMocks();
      const sender    = makeSenderAccount();
      const recipient = makeRecipientAccount();
      const amount    = 50000; // ₹500

      (accountRepository.findById as Mock)
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(recipient);

      await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: sender.id,
          toAccountId:   recipient.id,
          amount,
        })
      );

      const ledgerCall = (ledgerRepository.createEntries as Mock)
        .mock.calls[0][0];

      // Exactly 2 entries — never 1, never 3
      expect(ledgerCall.entries).toHaveLength(2);

      const debit  = ledgerCall.entries
        .find((e: any) => e.entryType === 'debit');
      const credit = ledgerCall.entries
        .find((e: any) => e.entryType === 'credit');

      // Both types must exist
      expect(debit).toBeDefined();
      expect(credit).toBeDefined();

      // Debit is on sender
      expect(debit.accountId).toBe(sender.id);
      // Credit is on recipient
      expect(credit.accountId).toBe(recipient.id);

      // Both must reference the same amount
      expect(debit.amount).toBe(amount);
      expect(credit.amount).toBe(amount);
    });

    it(`LED-02: records correct balanceBefore and balanceAfter
        in both ledger entries matching actual balance changes`,
      async () => {
      // WHY: balanceBefore and balanceAfter create an
      // audit trail that lets us reconstruct any account's
      // balance at any point in time by replaying the ledger.

      const senderBalance    = 1000000; // ₹10,000
      const recipientBalance = 50000;   // ₹500
      const amount           = 200000;  // ₹2,000

      const sender    = makeSenderAccount({
        balance: senderBalance
      });
      const recipient = makeRecipientAccount({
        balance: recipientBalance
      });

      setupHappyPathMocks();
      (accountRepository.findById as Mock)
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(recipient);

      await paymentService.initiatePayment(
        makePaymentParams({
          fromAccountId: sender.id,
          toAccountId:   recipient.id,
          amount,
        })
      );

      const entries = (ledgerRepository.createEntries as Mock)
        .mock.calls[0][0].entries;

      const debit  = entries.find((e:any) => e.entryType==='debit');
      const credit = entries.find((e:any) => e.entryType==='credit');

      // Sender: balance goes DOWN
      expect(debit.balanceBefore).toBe(senderBalance);
      expect(debit.balanceAfter)
        .toBe(senderBalance - amount); // 800000

      // Recipient: balance goes UP
      expect(credit.balanceBefore).toBe(recipientBalance);
      expect(credit.balanceAfter)
        .toBe(recipientBalance + amount); // 250000

      // THE LEDGER INVARIANT:
      // debit amount must always equal credit amount
      expect(debit.amount).toBe(credit.amount);
    });

    it(`LED-03: uses the real transaction ID from the
        inserted transaction record — not undefined,
        not a placeholder`, async () => {
      // WHY: This catches the most common bug — using
      // newTransaction.id before the transaction is inserted.
      // If the order is wrong, transaction_id is undefined
      // and ledger entries have no foreign key.

      const realTransactionId = 'txn-real-uuid-from-database';
      setupHappyPathMocks();
      (transactionRepository.create as Mock)
        .mockResolvedValue(makeTransaction({
          id: realTransactionId
        }));

      await paymentService.initiatePayment(makePaymentParams());

      const entries = (ledgerRepository.createEntries as Mock)
        .mock.calls[0][0].entries;

      // Every entry must use the REAL database ID
      entries.forEach((entry: any) => {
        expect(entry.transactionId).toBe(realTransactionId);
        expect(entry.transactionId).not.toBeUndefined();
        expect(entry.transactionId).not.toBeNull();
      });
    });

  });

────────────────────────────────────────────────────────────────
SECTION 2.7 — KAFKA EVENT TESTS
────────────────────────────────────────────────────────────────

  describe('Kafka Events', () => {

    it(`KAFKA-01: publishes payment.completed event AFTER
        DB commits — never inside the DB transaction block`,
      async () => {
      // WHY: If Kafka publish is inside db.transaction()
      // and Kafka fails, the entire DB transaction rolls back.
      // The payment never completes even though it should.
      // Kafka must be called AFTER the commit, always.

      const executionOrder: string[] = [];

      (db.transaction as Mock).mockImplementation(
        async (callback: Function) => {
          const result = await callback({});
          executionOrder.push('DB_COMMITTED');
          return result;
        }
      );

      (kafka.publish as Mock).mockImplementation(async () => {
        executionOrder.push('KAFKA_PUBLISHED');
      });

      setupLocksAndCache();
      setupAccountMocks();

      await paymentService.initiatePayment(makePaymentParams());

      // DB commit must happen BEFORE Kafka publish
      expect(executionOrder.indexOf('DB_COMMITTED'))
        .toBeLessThan(
          executionOrder.indexOf('KAFKA_PUBLISHED')
        );
    });

    it(`KAFKA-02: publishes payment.completed with all
        required fields in the standard event envelope`,
      async () => {
      // WHY: Webhook service and notification service depend
      // on this event. If fields are missing, downstream
      // services break silently.

      const txnId = randomUUID();
      const traceId = randomUUID();
      setupHappyPathMocks();
      (transactionRepository.create as Mock)
        .mockResolvedValue(makeTransaction({ id: txnId }));

      await paymentService.initiatePayment(
        makePaymentParams({ traceId })
      );

      expect(kafka.publish).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          eventId:   expect.any(String),
          eventType: 'payment.completed',
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T/  // ISO 8601 format
          ),
          version:   '1.0',
          traceId:   traceId,
          data: expect.objectContaining({
            transactionId: txnId,
            amount:        expect.any(Number),
            currency:      'INR',
          }),
        })
      );
    });

    it(`KAFKA-03: publishes payment.fraud_blocked instead of
        payment.completed when fraud engine declines`, async () => {
      // WHY: Different events trigger different downstream
      // actions. Blocked payments need special handling.

      setupLocksAndCache();
      (fraudService.check as Mock)
        .mockResolvedValue(makeHighRiskFraudResult());

      await paymentService.initiatePayment(makePaymentParams());

      // payment.completed must NOT be published
      const completedCalls = (kafka.publish as Mock).mock.calls
        .filter((args: any[]) => args[0] === 'payment.completed');
      expect(completedCalls).toHaveLength(0);

      // payment.fraud_blocked MUST be published
      expect(kafka.publish).toHaveBeenCalledWith(
        'payment.fraud_blocked',
        expect.objectContaining({
          data: expect.objectContaining({
            fraudScore: 85,
          }),
        })
      );
    });

    it(`KAFKA-04: publishes payment.failed event when
        payment fails for any business reason`, async () => {
      // WHY: Notification service sends failure emails
      // based on this event.

      setupLocksAndCache();
      (accountRepository.findById as Mock)
        .mockResolvedValue(makeSenderAccount({ balance: 100 }));

      await paymentService.initiatePayment(
        makePaymentParams({ amount: 50000 })
      );

      expect(kafka.publish).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'INSUFFICIENT_BALANCE',
          }),
        })
      );
    });

  });

═══════════════════════════════════════════════════════════════
PART 3 — FRAUD ENGINE UNIT TESTS
"Test every rule independently and together"
═══════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────
SECTION 3.1 — FRAUD ENGINE ORCHESTRATION
────────────────────────────────────────────────────────────────

Create: tests/unit/fraud/fraudEngine.test.ts

  it(`FRAUD-01: runs all 6 rules in parallel using
      Promise.all — total time equals slowest rule,
      not sum of all rules`, async () => {
    // WHY: Sequential = 48ms. Parallel = 10ms.
    // At 62 TPS this difference determines if we meet SLA.
    // This test measures actual execution time.

    const delays = [10, 8, 7, 9, 6, 8]; // ms per rule
    const rules  = ['velocity','amount','hour',
                    'newAccount','round','recipient'];

    rules.forEach((rule, i) => {
      mockRule(rule, delays[i]);
    });

    const start = Date.now();
    await fraudEngine.run(makeFraudInput());
    const duration = Date.now() - start;

    // Parallel: max(10,8,7,9,6,8) = 10ms (with overhead ~25ms)
    // Sequential would be: 10+8+7+9+6+8 = 48ms
    expect(duration).toBeLessThan(30);
    // All 6 rules must have been called
    rules.forEach(rule => {
      expect(mockRuleFn(rule)).toHaveBeenCalledOnce();
    });
  });

  it(`FRAUD-02: correctly sums scores from fired rules
      and returns signals array with only fired rules`, async () => {
    // VELOCITY fires: +25
    // AMOUNT fires: +30
    // Others do not fire: +0
    // Total: 55 → action: review

    setupFraudMocks({
      VELOCITY_CHECK: { scoreAdded: 25 },
      AMOUNT_ANOMALY: { scoreAdded: 30 },
    });

    const result = await fraudEngine.run(makeFraudInput());

    expect(result.score).toBe(55);
    expect(result.action).toBe('review');
    expect(result.signals).toHaveLength(2);
  });

  it(`FRAUD-03: caps score at 100 even when sum of
      all rules exceeds 100`, async () => {
    // All 6 rules fire: 25+30+10+15+5+20 = 105 → cap at 100

    setupAllRulesFired();

    const result = await fraudEngine.run(makeFraudInput());

    expect(result.score).toBe(100); // NOT 105
    expect(result.action).toBe('decline');
  });

  // Score boundary tests — test every transition point
  describe('Score to Action Mapping', () => {
    const cases = [
      { score: 0,   expected: 'approve'   },
      { score: 29,  expected: 'approve'   }, // upper boundary
      { score: 30,  expected: 'review'    }, // lower boundary
      { score: 59,  expected: 'review'    }, // upper boundary
      { score: 60,  expected: 'challenge' }, // lower boundary
      { score: 79,  expected: 'challenge' }, // upper boundary
      { score: 80,  expected: 'decline'   }, // lower boundary
      { score: 100, expected: 'decline'   },
    ];

    cases.forEach(({ score, expected }) => {
      it(`FRAUD-SCORE-${score}: score ${score} → "${expected}"`,
        () => {
        // WHY: Off-by-one errors at boundaries are the most
        // common bug in scoring systems. Test every boundary.
        expect(scoreToAction(score)).toBe(expected);
      });
    });
  });

────────────────────────────────────────────────────────────────
SECTION 3.2 — INDIVIDUAL RULE TESTS
────────────────────────────────────────────────────────────────

Create: tests/unit/fraud/velocityRule.test.ts

  describe('VelocityRule', () => {
    it(`VEL-01: returns null when account has 3 or fewer
        transactions in last 60 seconds (does not fire)`,
      async () => {
      (redis.incr as Mock).mockResolvedValue(3); // exactly 3
      const signal = await checkVelocity('acc-id');
      expect(signal).toBeNull();
    });

    it(`VEL-02: returns 25-point signal when account has
        more than 3 transactions in 60 seconds`, async () => {
      (redis.incr as Mock).mockResolvedValue(4); // 4 = triggers
      const signal = await checkVelocity('acc-id');
      expect(signal).not.toBeNull();
      expect(signal!.scoreAdded).toBe(25);
      expect(signal!.ruleName).toBe('VELOCITY_CHECK');
      expect(signal!.data.transactionsInLastMinute).toBe(4);
    });

    it(`VEL-03: sets TTL to exactly 60 seconds so counter
        resets after one minute`, async () => {
      (redis.incr as Mock).mockResolvedValue(1);
      await checkVelocity('acc-id');
      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining('acc-id'), 60
      );
    });

    it(`VEL-04: uses account-specific key so different
        accounts do not share velocity counters`, async () => {
      (redis.incr as Mock).mockResolvedValue(1);
      await checkVelocity('acc-111');
      await checkVelocity('acc-222');

      const keys = (redis.incr as Mock).mock.calls
        .map((c: any[]) => c[0]);
      expect(keys[0]).toContain('acc-111');
      expect(keys[1]).toContain('acc-222');
      expect(keys[0]).not.toBe(keys[1]);
    });
  });

Create: tests/unit/fraud/unusualHourRule.test.ts

  describe('UnusualHourRule', () => {
    afterEach(() => vi.useRealTimers());

    it(`HOUR-01: fires at 1am IST — start of suspicious
        window`, async () => {
      // 1am IST = 7:30pm UTC (IST = UTC + 5:30)
      vi.setSystemTime(new Date('2026-02-19T19:30:00.000Z'));
      const signal = await checkUnusualHour();
      expect(signal).not.toBeNull();
      expect(signal!.scoreAdded).toBe(10);
    });

    it(`HOUR-02: fires at 5am IST — end of suspicious
        window (inclusive boundary)`, async () => {
      // 5am IST = 11:30pm UTC
      vi.setSystemTime(new Date('2026-02-18T23:30:00.000Z'));
      const signal = await checkUnusualHour();
      expect(signal).not.toBeNull();
    });

    it(`HOUR-03: does NOT fire at 6am IST — just outside
        suspicious window`, async () => {
      // 6am IST = 12:30am UTC
      vi.setSystemTime(new Date('2026-02-19T00:30:00.000Z'));
      const signal = await checkUnusualHour();
      expect(signal).toBeNull();
    });

    it(`HOUR-04: does NOT fire at 2pm IST — normal
        business hours`, async () => {
      // 2pm IST = 8:30am UTC
      vi.setSystemTime(new Date('2026-02-19T08:30:00.000Z'));
      const signal = await checkUnusualHour();
      expect(signal).toBeNull();
    });

    it(`HOUR-05: fires at 3am IST — middle of window`, async () => {
      // 3am IST = 9:30pm UTC
      vi.setSystemTime(new Date('2026-02-19T21:30:00.000Z'));
      const signal = await checkUnusualHour();
      expect(signal).not.toBeNull();
    });
  });

Create: tests/unit/fraud/roundAmountRule.test.ts

  describe('RoundAmountRule', () => {
    const suspiciousAmounts = [
      { paise: 100000,  rupees: '₹1,000'  },
      { paise: 500000,  rupees: '₹5,000'  },
      { paise: 1000000, rupees: '₹10,000' },
      { paise: 5000000, rupees: '₹50,000' },
    ];

    suspiciousAmounts.forEach(({ paise, rupees }) => {
      it(`ROUND-01: fires for suspicious round amount
          ${rupees} (${paise} paise)`, async () => {
        const signal = await checkRoundAmount(paise);
        expect(signal).not.toBeNull();
        expect(signal!.scoreAdded).toBe(5);
      });
    });

    it(`ROUND-02: does NOT fire for ₹999 — not round`,
      async () => {
      const signal = await checkRoundAmount(99900);
      expect(signal).toBeNull();
    });

    it(`ROUND-03: does NOT fire for ₹1001 — close but
        not suspicious`, async () => {
      const signal = await checkRoundAmount(100100);
      expect(signal).toBeNull();
    });

    it(`ROUND-04: does NOT fire for ₹200 — only specific
        amounts are suspicious`, async () => {
      const signal = await checkRoundAmount(20000);
      expect(signal).toBeNull();
    });
  });

═══════════════════════════════════════════════════════════════
PART 4 — WEBHOOK SERVICE UNIT TESTS
═══════════════════════════════════════════════════════════════

Create: tests/unit/webhook/signer.test.ts

  describe('WebhookSigner', () => {
    it(`SIGN-01: signature starts with sha256= prefix
        matching Stripe format exactly`, () => {
      const sig = signPayload('secret', 'payload');
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it(`SIGN-02: same inputs always produce same signature
        (deterministic)`, () => {
      expect(signPayload('secret', 'payload'))
        .toBe(signPayload('secret', 'payload'));
    });

    it(`SIGN-03: different payload produces different
        signature (tamper detection)`, () => {
      expect(signPayload('secret', '{"amount":100}'))
        .not.toBe(signPayload('secret', '{"amount":200}'));
    });

    it(`SIGN-04: different secret produces different
        signature (key isolation)`, () => {
      expect(signPayload('secret-A', 'payload'))
        .not.toBe(signPayload('secret-B', 'payload'));
    });
  });

Create: tests/unit/webhook/retryWorker.test.ts

  describe('RetryWorker', () => {
    it(`RETRY-01: schedules retry 1 at exactly 30 seconds
        after first failure`, async () => {
      setupFailingDelivery({ attemptNumber: 1 });
      await retryWorker.process();

      const nextRetry = getScheduledRetryTime();
      const expected  = Date.now() + 30000;
      expect(Math.abs(nextRetry - expected)).toBeLessThan(1000);
    });

    it(`RETRY-02: schedules retry 2 at exactly 300 seconds
        (5 minutes) after second failure`, async () => {
      setupFailingDelivery({ attemptNumber: 2 });
      await retryWorker.process();

      const nextRetry = getScheduledRetryTime();
      const expected  = Date.now() + 300000;
      expect(Math.abs(nextRetry - expected)).toBeLessThan(1000);
    });

    it(`RETRY-03: schedules retry 3 at exactly 1800 seconds
        (30 minutes) after third failure`, async () => {
      setupFailingDelivery({ attemptNumber: 3 });
      await retryWorker.process();
      const nextRetry = getScheduledRetryTime();
      expect(Math.abs(nextRetry - (Date.now() + 1800000)))
        .toBeLessThan(1000);
    });

    it(`RETRY-04: schedules retry 4 at exactly 7200 seconds
        (2 hours) after fourth failure`, async () => {
      setupFailingDelivery({ attemptNumber: 4 });
      await retryWorker.process();
      const nextRetry = getScheduledRetryTime();
      expect(Math.abs(nextRetry - (Date.now() + 7200000)))
        .toBeLessThan(1000);
    });

    it(`RETRY-05: permanently marks as FAILED after 4
        retries are exhausted — no more retries`, async () => {
      setupFailingDelivery({ attemptNumber: 5 });
      await retryWorker.process();
      expect(webhookRepository.markFailed)
        .toHaveBeenCalledWith(
          'delivery-id', expect.anything()
        );
      expect(webhookRepository.scheduleRetry)
        .not.toHaveBeenCalled();
    });
  });

═══════════════════════════════════════════════════════════════
PART 5 — INTEGRATION TESTS WITH REAL DATABASE
"Prove components work together correctly"
═══════════════════════════════════════════════════════════════

Create: tests/integration/payment.integration.test.ts

  // IMPORTANT: Integration tests use a REAL test database.
  // Set TEST_DATABASE_URL in your .env.test file.
  // Never run integration tests against production database.

  import { describe, it, expect, beforeEach } from 'vitest';
  import {
    cleanDatabase, cleanRedis,
    createTestUser, createTestAccount,
    getAccountBalance, getLedgerEntries,
    getFraudSignals,
  } from './setup';
  import { paymentService }
    from '../../services/payment.service';
  import { db } from '@settlr/database';
  import { randomUUID } from 'crypto';

  describe('Payment Integration Tests', () => {

    let sender:           any;
    let recipient:        any;
    let senderAccount:    any;
    let recipientAccount: any;

    beforeEach(async () => {
      await cleanDatabase();
      await cleanRedis();
      sender           = await createTestUser();
      recipient        = await createTestUser();
      senderAccount    = await createTestAccount(
        sender.id, 1000000 // ₹10,000
      );
      recipientAccount = await createTestAccount(
        recipient.id, 0
      );
    });

    it(`INT-01: completes full payment end-to-end — deducts
        sender balance, credits recipient, status completed,
        ledger entries exist in real database`, async () => {
      // WHY: Unit tests mock the database.
      // This test uses a REAL database to prove the actual
      // SQL queries, transactions, and constraints work.
      // This is the most important integration test.

      const amount = 50000; // ₹500

      const result = await paymentService.initiatePayment({
        idempotencyKey: randomUUID(),
        fromAccountId:  senderAccount.id,
        toAccountId:    recipientAccount.id,
        amount,
        currency:       'INR',
        description:    'integration test payment',
        userId:         sender.id,
        traceId:        randomUUID(),
      });

      // Payment must succeed
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');

      // Verify sender balance decreased in REAL DB
      const senderFinal = await getAccountBalance(
        senderAccount.id
      );
      expect(senderFinal).toBe(1000000 - amount); // 950000

      // Verify recipient balance increased in REAL DB
      const recipientFinal = await getAccountBalance(
        recipientAccount.id
      );
      expect(recipientFinal).toBe(amount); // 50000

      // Verify exactly 2 ledger entries in REAL DB
      const entries = await getLedgerEntries(result.data.id);
      expect(entries).toHaveLength(2);

      const debit  = entries.find(e => e.entry_type === 'debit');
      const credit = entries.find(e => e.entry_type === 'credit');
      expect(debit).toBeDefined();
      expect(credit).toBeDefined();
      expect(debit!.amount).toBe(amount);
      expect(credit!.amount).toBe(amount);
      expect(debit!.balance_before).toBe(1000000);
      expect(debit!.balance_after).toBe(950000);
      expect(credit!.balance_before).toBe(0);
      expect(credit!.balance_after).toBe(50000);
    });

    it(`INT-02: idempotency with real Redis — second request
        with same key returns cached response and creates
        ZERO additional transactions in database`, async () => {
      // WHY: Tests that Redis cache + DB UNIQUE constraint
      // together prevent double charging in real environment.

      const idempotencyKey = randomUUID();
      const params = {
        idempotencyKey,
        fromAccountId: senderAccount.id,
        toAccountId:   recipientAccount.id,
        amount:        10000, // ₹100
        currency:      'INR',
        userId:        sender.id,
        traceId:       randomUUID(),
      };

      const result1 = await paymentService.initiatePayment(params);
      const result2 = await paymentService.initiatePayment(params);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);
      expect(result2.data.id).toBe(result1.data.id);

      // Only ONE transaction in database — not two
      const transactions = await db('transactions')
        .where({ idempotency_key: idempotencyKey });
      expect(transactions).toHaveLength(1);

      // Balance deducted only ONCE
      const finalBalance = await getAccountBalance(
        senderAccount.id
      );
      expect(finalBalance).toBe(1000000 - 10000); // ₹9,900
    });

    it(`INT-03: fraud signals saved to database when rules
        fire — admin panel reads from this table`, async () => {
      // WHY: Admin fraud panel shows fraud signals.
      // If signals are not saved to DB, the panel is empty.
      // This test uses a new account (age < 7 days) which
      // triggers the NEW_ACCOUNT rule.

      const newUser = await createTestUser();
      const newAccount = await createTestAccount(
        newUser.id, 500000
      );
      // newAccount was just created — age is 0 days
      // NEW_ACCOUNT rule should fire (+15 points)

      const result = await paymentService.initiatePayment({
        idempotencyKey: randomUUID(),
        fromAccountId:  newAccount.id,
        toAccountId:    recipientAccount.id,
        amount:         10000,
        currency:       'INR',
        userId:         newUser.id,
        traceId:        randomUUID(),
      });

      expect(result.success).toBe(true);

      // Fraud signals must be in real database
      const signals = await getFraudSignals(result.data.id);
      expect(signals.length).toBeGreaterThan(0);

      const newAccountSignal = signals.find(
        s => s.rule_name === 'NEW_ACCOUNT'
      );
      expect(newAccountSignal).toBeDefined();
      expect(newAccountSignal!.score_added).toBe(15);
    });

    it(`INT-04: fails with INSUFFICIENT_BALANCE and does
        NOT modify any balance in database`, async () => {
      // WHY: Failed payments must leave database completely
      // unchanged. Even partial modifications are bugs.

      const result = await paymentService.initiatePayment({
        idempotencyKey: randomUUID(),
        fromAccountId:  senderAccount.id,
        toAccountId:    recipientAccount.id,
        amount:         9999999, // way more than balance
        currency:       'INR',
        userId:         sender.id,
        traceId:        randomUUID(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_BALANCE');

      // Balances must be completely unchanged
      expect(await getAccountBalance(senderAccount.id))
        .toBe(1000000);
      expect(await getAccountBalance(recipientAccount.id))
        .toBe(0);

      // Zero ledger entries for failed payment
      const transactions = await db('transactions')
        .where({ status: 'failed' });
      const ledgerEntries = transactions.length > 0
        ? await getLedgerEntries(transactions[0].id)
        : [];
      expect(ledgerEntries).toHaveLength(0);
    });

═══════════════════════════════════════════════════════════════
PART 6 — CONCURRENT PAYMENT INTEGRATION TESTS
"The tests that prove your race condition handling works"
═══════════════════════════════════════════════════════════════

Create: tests/integration/concurrent.integration.test.ts

    it(`CONC-01: 10 simultaneous payments from same account
        — total deducted equals exactly sum of successful
        payments, ZERO money created or lost`, async () => {
      // WHY: This is THE most important test in the codebase.
      // It proves that our three-layer concurrency protection
      // (Redis lock + DB FOR UPDATE + optimistic version)
      // actually works under real concurrent load.
      //
      // Without locking: all 10 payments might pass the
      // balance check simultaneously and deduct 10x the amount.
      // With locking: exactly the correct number succeed.
      //
      // This is what you show FAANG interviewers when they ask
      // "How did you test your race condition handling?"

      const initialBalance = 5000000; // ₹50,000
      const transferAmount = 600000;  // ₹6,000 each
      // Maximum that can succeed: floor(50000/6000) = 8

      senderAccount = await createTestAccount(
        sender.id, initialBalance
      );

      // Create 10 different recipients
      const recipients = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const u = await createTestUser();
          return createTestAccount(u.id, 0);
        })
      );

      // Fire ALL 10 payments simultaneously
      // Promise.allSettled continues even if some fail
      const results = await Promise.allSettled(
        recipients.map(rec =>
          paymentService.initiatePayment({
            idempotencyKey: randomUUID(), // unique per payment
            fromAccountId:  senderAccount.id,
            toAccountId:    rec.id,
            amount:         transferAmount,
            currency:       'INR',
            userId:         sender.id,
            traceId:        randomUUID(),
          })
        )
      );

      // Count successes
      const successes = results.filter(
        r => r.status === 'fulfilled' &&
             (r as any).value.success === true
      );

      // Get final balances from REAL database
      const finalSender = await getAccountBalance(
        senderAccount.id
      );
      const recipientBalances = await Promise.all(
        recipients.map(r => getAccountBalance(r.id))
      );
      const totalRecipients = recipientBalances
        .reduce((sum, b) => sum + b, 0);

      // ═══════════════════════════════════════════════════
      // THE MONEY CONSERVATION INVARIANT
      // This is the mathematical proof that our system is
      // correct. initialBalance = finalSender + allRecipients
      // If this fails, money was created or destroyed — BUG.
      // ═══════════════════════════════════════════════════
      expect(finalSender + totalRecipients).toBe(initialBalance);

      // Each recipient has either 0 or exactly transferAmount
      // No partial payments allowed
      recipientBalances.forEach(balance => {
        expect([0, transferAmount]).toContain(balance);
      });

      // Sender balance never went negative
      expect(finalSender).toBeGreaterThanOrEqual(0);

      // Number of successes × amount = balance reduction
      expect(successes.length * transferAmount)
        .toBe(initialBalance - finalSender);

      console.log(`
        Concurrent Test Results:
        Attempted: 10 payments
        Succeeded: ${successes.length}
        Failed:    ${10 - successes.length}
        Expected max successes: ${Math.floor(initialBalance/transferAmount)}
        Money conservation: ${finalSender + totalRecipients} = ${initialBalance} ✓
      `);
    });

    it(`CONC-02: bidirectional concurrent payments do not
        deadlock — A→B and B→A fire simultaneously and
        both complete within 2 seconds`, async () => {
      // WHY: Without UUID sort ordering for lock acquisition,
      // A→B and B→A deadlock each other forever.
      // Thread A holds lock on acc-A, waits for lock on acc-B.
      // Thread B holds lock on acc-B, waits for lock on acc-A.
      // Neither can proceed. Both timeout.
      //
      // With UUID sorting, both threads always acquire locks
      // in the same alphabetical order. Deadlock impossible.
      // This test proves that is actually true.

      const balanceA = 500000; // ₹5,000
      const balanceB = 500000;
      const amount   = 100000; // ₹1,000

      const accountA = await createTestAccount(
        sender.id, balanceA
      );
      const accountB = await createTestAccount(
        recipient.id, balanceB
      );

      const start = Date.now();

      // Fire BOTH directions simultaneously
      const [resultAtoB, resultBtoA] = await Promise.all([
        paymentService.initiatePayment({
          idempotencyKey: randomUUID(),
          fromAccountId:  accountA.id,
          toAccountId:    accountB.id,
          amount,
          currency:       'INR',
          userId:         sender.id,
          traceId:        'trace-a-to-b',
        }),
        paymentService.initiatePayment({
          idempotencyKey: randomUUID(),
          fromAccountId:  accountB.id,
          toAccountId:    accountA.id,
          amount,
          currency:       'INR',
          userId:         recipient.id,
          traceId:        'trace-b-to-a',
        }),
      ]);

      const duration = Date.now() - start;

      // Must complete in under 2 seconds — no deadlock
      expect(duration).toBeLessThan(2000);

      // At least one direction must succeed
      expect(resultAtoB.success || resultBtoA.success)
        .toBe(true);

      // Money conservation holds even in bidirectional case
      const finalA = await getAccountBalance(accountA.id);
      const finalB = await getAccountBalance(accountB.id);
      expect(finalA + finalB).toBe(balanceA + balanceB);
    });

    it(`CONC-03: double-entry ledger audit passes after
        50 concurrent transactions — sum of all debits
        equals sum of all credits exactly`, async () => {
      // WHY: This is the mathematical proof that our
      // double-entry accounting is correct at scale.
      // Run after every load test to verify integrity.
      //
      // SUM(all debits) = SUM(all credits)
      // If this fails even by 1 paise, there is a critical bug.

      // Run 50 payments of random amounts
      for (let i = 0; i < 50; i++) {
        const amount = Math.floor(Math.random() * 5000) + 100;
        await paymentService.initiatePayment({
          idempotencyKey: randomUUID(),
          fromAccountId:  senderAccount.id,
          toAccountId:    recipientAccount.id,
          amount,
          currency:       'INR',
          userId:         sender.id,
          traceId:        randomUUID(),
        });
      }

      // Run the double-entry accounting audit query
      const [result] = await db.raw(`
        SELECT
          SUM(CASE WHEN entry_type='debit'
              THEN amount ELSE 0 END) as total_debits,
          SUM(CASE WHEN entry_type='credit'
              THEN amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN entry_type='debit'
              THEN amount ELSE 0 END) -
          SUM(CASE WHEN entry_type='credit'
              THEN amount ELSE 0 END) as difference
        FROM ledger_entries
      `);

      const debitSum  = Number(result.rows[0].total_debits);
      const creditSum = Number(result.rows[0].total_credits);
      const diff      = Number(result.rows[0].difference);

      console.log(`
        Ledger Audit:
        Total Debits:  ${debitSum} paise
        Total Credits: ${creditSum} paise
        Difference:    ${diff} paise ← must be 0
      `);

      // THE MOST IMPORTANT ASSERTION IN THE ENTIRE CODEBASE
      // If this fails, money was created or destroyed
      expect(diff).toBe(0);
    });

═══════════════════════════════════════════════════════════════
PART 7 — LOAD TESTS WITH K6
"Generate the numbers that go on your resume"
═══════════════════════════════════════════════════════════════

Create: k6/payment.load.test.js

  // ─────────────────────────────────────────────────────────
  // This load test generates your resume numbers.
  // Run it, screenshot the results, put them in README.md.
  //
  // Target numbers to achieve:
  //   Total requests:    ~48,000 over 5 minutes
  //   Success rate:       99.7%+
  //   P50 latency:        <120ms
  //   P95 latency:        <300ms
  //   P99 latency:        <500ms
  //   Peak TPS:           ~62
  //   Duplicate charges:    0
  //   Balance errors:       0
  // ─────────────────────────────────────────────────────────

  import http from 'k6/http';
  import { check, sleep } from 'k6';
  import { Rate, Trend, Counter } from 'k6/metrics';
  import { uuidv4 }
    from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

  // Custom metrics shown in final report
  const paymentSuccessRate  = new Rate('payment_success');
  const paymentLatency      = new Trend('payment_latency_ms', true);
  const fraudBlockedCounter = new Counter('fraud_blocked_total');
  const errorCounter        = new Counter('error_total');

  export const options = {
    stages: [
      { duration: '1m', target: 100 }, // warm up
      { duration: '1m', target: 300 }, // ramp up
      { duration: '1m', target: 500 }, // peak load
      { duration: '3m', target: 500 }, // hold at peak
      { duration: '1m', target: 0   }, // cool down
    ],
    // Test FAILS in CI if thresholds not met
    thresholds: {
      payment_success:        ['rate>0.99'],
      payment_latency_ms:     [
        'p(50)<120',
        'p(95)<300',
        'p(99)<500',
      ],
      http_req_failed:        ['rate<0.01'],
      http_req_duration:      ['p(99)<600'],
    },
  };

  // Run once before test — login and get token
  export function setup() {
    const loginRes = http.post(
      `${__ENV.API_URL}/api/v1/auth/login`,
      JSON.stringify({
        email:    __ENV.LOAD_TEST_EMAIL,
        password: __ENV.LOAD_TEST_PASSWORD,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status !== 200) {
      throw new Error(
        `Login failed: ${loginRes.status} ${loginRes.body}`
      );
    }

    return {
      token:         loginRes.json('data.accessToken'),
      fromAccountId: loginRes.json('data.account.id'),
      toAccountId:   __ENV.RECIPIENT_ACCOUNT_ID,
    };
  }

  // Runs for every virtual user on every iteration
  export default function(data) {
    const headers = {
      'Content-Type':    'application/json',
      'Authorization':   `Bearer ${data.token}`,
      'Idempotency-Key': uuidv4(), // unique per request
    };

    // Random small amounts to avoid balance exhaustion
    const amountPaise = Math.floor(Math.random() * 900) + 100;

    const start = Date.now();
    const res = http.post(
      `${__ENV.API_URL}/api/v1/payments`,
      JSON.stringify({
        toAccountId:  data.toAccountId,
        amount:       amountPaise,
        currency:     'INR',
        description:  'k6 load test',
      }),
      { headers, timeout: '10s' }
    );
    const duration = Date.now() - start;

    paymentLatency.add(duration);

    const success      = res.status === 201;
    const fraudBlocked = res.status === 403;
    const serverError  = res.status >= 500;

    paymentSuccessRate.add(success);
    if (fraudBlocked) fraudBlockedCounter.add(1);
    if (serverError)  errorCounter.add(1);

    check(res, {
      'status is 201 or valid error': r =>
        [201, 400, 403, 409, 422, 429].includes(r.status),
      'response has success field': r =>
        r.json('success') !== undefined,
      'response has traceId': r =>
        r.json('traceId') !== undefined,
      'no 500 server errors': r => r.status < 500,
    });

    // Realistic think time between requests
    sleep(Math.random() * 1.5 + 0.5);
  }

  HOW TO RUN:

    # Step 1 — Start your services
    docker-compose up -d

    # Step 2 — Create load test user in your database
    # (user needs large balance for load test)
    # Run in Supabase SQL editor:
    INSERT INTO users (id, email, name, password_hash, kyc_status)
    VALUES (
      gen_random_uuid(),
      'loadtest@settlr.dev',
      'Load Test User',
      '$2b$12$...',  -- bcrypt hash of 'LoadTest123!'
      'verified'
    );
    INSERT INTO accounts (user_id, balance, currency, status)
    VALUES (
      (SELECT id FROM users WHERE email='loadtest@settlr.dev'),
      999999999,  -- ₹9,999,999 for load testing
      'INR',
      'active'
    );

    # Step 3 — Set environment variables
    export API_URL=http://localhost:3000
    export LOAD_TEST_EMAIL=loadtest@settlr.dev
    export LOAD_TEST_PASSWORD=LoadTest123!
    export RECIPIENT_ACCOUNT_ID=<any-other-account-uuid>

    # Step 4 — Run the load test
    k6 run k6/payment.load.test.js

    # Step 5 — After test, run verification queries in Supabase
    -- Money conservation check (difference MUST be 0)
    SELECT
      SUM(CASE WHEN entry_type='debit'
          THEN amount ELSE 0 END) -
      SUM(CASE WHEN entry_type='credit'
          THEN amount ELSE 0 END) as difference
    FROM ledger_entries;

    -- Duplicate charges check (MUST return 0 rows)
    SELECT idempotency_key, COUNT(*) as count
    FROM transactions
    GROUP BY idempotency_key
    HAVING COUNT(*) > 1;

    -- Negative balance check (MUST return 0 rows)
    SELECT id, balance FROM accounts WHERE balance < 0;

    -- Success rate check
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status='completed') as completed,
      ROUND(
        COUNT(*) FILTER (WHERE status='completed') * 100.0
        / COUNT(*), 2
      ) as success_pct
    FROM transactions;

    -- Peak TPS achieved
    SELECT
      DATE_TRUNC('second', created_at) as second,
      COUNT(*) as tps
    FROM transactions
    WHERE status = 'completed'
    GROUP BY 1
    ORDER BY tps DESC
    LIMIT 5;

    # Step 6 — Copy all numbers to README.md

═══════════════════════════════════════════════════════════════
PART 8 — CI/CD PIPELINE THAT RUNS ALL TESTS
═══════════════════════════════════════════════════════════════

Create: .github/workflows/ci.yml

  name: Settlr CI — Tests + Coverage + Build

  on:
    push:      { branches: [main, develop] }
    pull_request: { branches: [main] }

  jobs:

    unit-tests:
      name: Unit Tests
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci
        - name: Run unit tests with coverage
          run: npm run test:unit:coverage
        - name: Check 80% coverage threshold
          run: |
            LINES=$(cat coverage/coverage-summary.json |
              python3 -c "import sys,json;
              d=json.load(sys.stdin);
              print(d['total']['lines']['pct'])")
            echo "Coverage: $LINES%"
            python3 -c "
              import sys
              if float('$LINES') < 80:
                print('FAIL: Coverage below 80%')
                sys.exit(1)
              print('PASS: Coverage meets threshold')
            "

    integration-tests:
      name: Integration Tests
      runs-on: ubuntu-latest
      needs: unit-tests
      services:
        postgres:
          image: postgres:15-alpine
          env:
            POSTGRES_DB:       settlr_test
            POSTGRES_USER:     postgres
            POSTGRES_PASSWORD: testpassword
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
          ports: ['5432:5432']
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20' }
        - run: npm ci
        - name: Run database migrations
          run: npm run migrate
          env:
            DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/settlr_test
        - name: Run integration tests
          run: npm run test:integration
          env:
            DATABASE_URL:        postgresql://postgres:testpassword@localhost:5432/settlr_test
            UPSTASH_REDIS_URL:   ${{ secrets.TEST_REDIS_URL }}
            JWT_SECRET:          test-jwt-secret-minimum-32-chars
            NODE_ENV:            test

    build-and-smoke:
      name: Docker Build + Smoke Test
      runs-on: ubuntu-latest
      needs: integration-tests
      steps:
        - uses: actions/checkout@v4
        - name: Build all Docker images
          run: docker-compose build --no-cache
        - name: Start all services
          run: |
            cp .env.example .env
            docker-compose up -d
        - name: Wait for all services healthy
          run: |
            echo "Waiting for services..."
            for PORT in 3000 3001 3002 3003 3004; do
              for i in $(seq 1 30); do
                curl -sf http://localhost:$PORT/health \
                  && echo "Port $PORT ready" && break \
                  || sleep 2
              done
            done
        - name: Smoke test all health endpoints
          run: |
            for PORT in 3000 3001 3002 3003 3004; do
              RESPONSE=$(curl -s http://localhost:$PORT/health)
              echo "Port $PORT: $RESPONSE"
              echo $RESPONSE | grep -q '"status":"ok"' \
                || (echo "FAIL: Port $PORT not healthy" && exit 1)
            done
        - name: Stop all services
          run: docker-compose down

═══════════════════════════════════════════════════════════════
PART 9 — START ORDER. DO THIS EXACTLY.
SHOW ME OUTPUT AFTER EACH STEP.
═══════════════════════════════════════════════════════════════

  Do these steps one at a time.
  Wait for me to say "next" before moving to the next step.
  After each step show me:
    1. The file you created
    2. The command you ran
    3. The output that proves it worked

  STEP 1:
    Install all testing dependencies from Part 1.1
    Create vitest.config.ts from Part 1.2 in every service
    Show me: npm install output + config file content

  STEP 2:
    Create tests/helpers.ts from Part 1.3
    Create tests/integration/setup.ts from Part 1.4
    Show me: both files

  STEP 3:
    Create payment.service.test.ts with ALL tests from Part 2
    Run: npm run test:unit
    Show me: test output with all tests passing
    If any test fails: fix the source code, not the test

  STEP 4:
    Create all fraud test files from Part 3
    Run: npm run test:unit
    Show me: all fraud tests passing

  STEP 5:
    Create webhook test files from Part 4
    Run: npm run test:unit
    Show me: all tests passing + coverage report

  STEP 6:
    Create integration test files from Parts 5 and 6
    Run: npm run test:integration
    Show me: integration tests passing especially CONC-01

  STEP 7:
    Create k6/payment.load.test.js from Part 7
    Run the load test for 1 minute first as a trial
    Show me: k6 output with latency numbers

  STEP 8:
    Run the full 5-minute load test
    Run all 5 verification SQL queries in Supabase
    Show me: all results including the difference = 0 proof

  STEP 9:
    Create .github/workflows/ci.yml from Part 8
    Push to GitHub
    Show me: green CI pipeline in GitHub Actions

  STEP 10:
    Add load test results to README.md
    Format as a table with all metrics
    Show me: the final README section

  START WITH STEP 1 NOW.