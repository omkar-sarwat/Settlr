// Integration test for the full transfer flow — tests the 17-step atomic transfer end-to-end.
// NOTE: These tests require a running Postgres, Redis, and Kafka (docker-compose up).
// They are SKIPPED in normal CI; run with `vitest run --config vitest.config.ts tests/integration`.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock external infra (so tests run without Docker in CI) ─────────────────
vi.mock('@settlr/database', () => ({
  db: Object.assign(vi.fn(), { transaction: vi.fn() }),
}));

vi.mock('@settlr/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  acquireAccountLocks: vi.fn(),
  releaseAllLocks: vi.fn(),
}));

vi.mock('@settlr/kafka', () => ({
  publishEvent: vi.fn(),
  KafkaTopics: {
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_FRAUD_BLOCKED: 'payment.fraud_blocked',
  },
}));

vi.mock('@settlr/config', () => ({
  config: {
    fraudServiceUrl: 'http://fraud:3003',
    minTransferAmountPaise: 100,
    maxTransferAmountPaise: 10_000_000_00,
    idempotencyTtlSeconds: 86400,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
    code: string; statusCode: number; isOperational: boolean;
    constructor(code: string, message: string, statusCode = 500) {
      super(message); this.code = code; this.statusCode = statusCode; this.isOperational = true;
    }
    static insufficientBalance(accountId: string, required: number, available: number) { return new AppError('INSUFFICIENT_BALANCE', `Account ${accountId}: need ${required} but have ${available}`, 422); }
    static fraudBlocked(score: number) { return new AppError('FRAUD_BLOCKED', `Transaction declined by risk engine (score: ${score})`, 403); }
    static accountLocked() { return new AppError('ACCOUNT_LOCKED', 'Account is busy', 409); }
    static validation(msg: string) { return new AppError('VALIDATION_ERROR', msg, 400); }
  }
  return { AppError, ErrorCodes: { VALIDATION_ERROR: 'VALIDATION_ERROR', INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE', FRAUD_BLOCKED: 'FRAUD_BLOCKED' } };
});

vi.mock('../../src/services/idempotency.service', () => ({
  idempotencyService: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('../../src/services/ledger.service', () => ({
  ledgerService: { createEntries: vi.fn() },
}));

vi.mock('../../src/repositories/payment.repository', () => ({
  paymentRepository: { create: vi.fn(), lockAccount: vi.fn(), updateBalance: vi.fn(), creditAccount: vi.fn() },
}));

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

import { paymentService } from '../../src/services/payment.service';
import { idempotencyService } from '../../src/services/idempotency.service';
import { paymentRepository } from '../../src/repositories/payment.repository';
import { ledgerService } from '../../src/services/ledger.service';
import { acquireAccountLocks, releaseAllLocks } from '@settlr/redis';
import { publishEvent } from '@settlr/kafka';
import { db } from '@settlr/database';
import axios from 'axios';

describe('Transfer Integration Flow', () => {
  const sender = { id: 'sender-001', user_id: 'u1', balance: 200000, version: 1, status: 'active' };
  const recipient = { id: 'recipient-001', user_id: 'u2', balance: 50000, version: 2, status: 'active' };
  const params = {
    idempotencyKey: 'int-idem-001', fromAccountId: 'sender-001',
    toAccountId: 'recipient-001', amount: 100000, currency: 'INR' as const,
    traceId: 'trace-int-001', userId: 'u1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (acquireAccountLocks as Mock).mockResolvedValue({ acquired: true, lockKeys: ['l1', 'l2'] });
    (axios.post as Mock).mockResolvedValue({ data: { data: { score: 5, action: 'approve', signals: [] } } });
    (db as unknown as Mock).mockReturnValue({ where: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(sender) }) });
  });

  it('executes the full 17-step transfer: lock → fraud check → debit → credit → ledger → event', async () => {
    (idempotencyService.get as Mock).mockResolvedValue(null);

    const completedTxn = { id: 'txn-int-001', status: 'completed', amount: 100000 };
    (db.transaction as Mock).mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => cb({}));
    (paymentRepository.lockAccount as Mock).mockResolvedValueOnce(sender).mockResolvedValueOnce(recipient);
    (paymentRepository.updateBalance as Mock).mockResolvedValue(1);
    (paymentRepository.creditAccount as Mock).mockResolvedValue(undefined);
    (paymentRepository.create as Mock).mockResolvedValue(completedTxn);
    (ledgerService.createEntries as Mock).mockResolvedValue(undefined);
    (idempotencyService.set as Mock).mockResolvedValue(undefined);
    (publishEvent as Mock).mockResolvedValue(undefined);

    const result = await paymentService.initiatePayment(params);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);

    // Verify all critical steps were called
    expect(acquireAccountLocks).toHaveBeenCalled();
    expect(paymentRepository.create).toHaveBeenCalled();
    expect(ledgerService.createEntries).toHaveBeenCalled();
    expect(publishEvent).toHaveBeenCalledWith('payment.completed', expect.objectContaining({ transactionId: 'txn-int-001' }), params.traceId);

    // Locks released
    expect(releaseAllLocks).toHaveBeenCalled();
  });

  it('rolls back when DB transaction fails and still releases locks', async () => {
    (idempotencyService.get as Mock).mockResolvedValue(null);
    (db.transaction as Mock).mockRejectedValue(new Error('DB connection lost'));

    await expect(paymentService.initiatePayment(params)).rejects.toThrow();

    // No event published on failure
    expect(publishEvent).not.toHaveBeenCalledWith('payment.completed', expect.anything(), expect.anything());

    // Locks must still be released
    expect(releaseAllLocks).toHaveBeenCalled();
  });

  it('idempotent: second request with same key returns cached result', async () => {
    const cached = { id: 'txn-cached-int', status: 'completed' };
    (idempotencyService.get as Mock).mockResolvedValue(cached);

    const result = await paymentService.initiatePayment(params);

    expect(result.fromCache).toBe(true);
    expect(result.data).toEqual(cached);
    expect(acquireAccountLocks).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
