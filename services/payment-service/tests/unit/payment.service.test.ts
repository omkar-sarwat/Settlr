// Unit tests for payment.service.ts — tests idempotency cache hit, insufficient balance,
// concurrent modification, successful transfer, fraud block, self-transfer. Mocks all external deps.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock ALL external dependencies ──────────────────────────────────────────
vi.mock('@settlr/database', () => ({
  db: Object.assign(vi.fn(), {
    transaction: vi.fn(),
  }),
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
    constructor(code: string, message: string, statusCode: number = 500) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.isOperational = true;
    }
    static validation(msg: string) { return new AppError('VALIDATION_ERROR', msg, 400); }
    static notFound(resource: string, id: string) { return new AppError('NOT_FOUND', `${resource} ${id} not found`, 404); }
    static insufficientBalance(accountId: string, required: number, available: number) { return new AppError('INSUFFICIENT_BALANCE', `Account ${accountId}: need ${required} but have ${available}`, 422); }
    static fraudBlocked(score: number) { return new AppError('FRAUD_BLOCKED', `Transaction declined by risk engine (score: ${score})`, 403); }
    static accountLocked() { return new AppError('ACCOUNT_LOCKED', 'Account is busy', 409); }
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

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

import { paymentService } from '../../src/services/payment.service';
import { idempotencyService } from '../../src/services/idempotency.service';
import { paymentRepository } from '../../src/repositories/payment.repository';
import { ledgerService } from '../../src/services/ledger.service';
import { acquireAccountLocks, releaseAllLocks } from '@settlr/redis';
import { publishEvent } from '@settlr/kafka';
import { db } from '@settlr/database';
import axios from 'axios';

// ── Shared test data ────────────────────────────────────────────────────────
const baseParams = {
  idempotencyKey: 'idem-key-001',
  fromAccountId: 'aaaa-1111-sender',
  toAccountId: 'bbbb-2222-recipient',
  amount: 50000, // ₹500 in paise
  currency: 'INR' as const,
  traceId: 'trace-abc-123',
  userId: 'user-001',
};

const mockFromAccount = {
  id: 'aaaa-1111-sender',
  user_id: 'user-001',
  balance: 100000,
  version: 1,
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
};

const mockToAccount = {
  id: 'bbbb-2222-recipient',
  user_id: 'user-002',
  balance: 20000,
  version: 3,
  status: 'active',
};

const mockTransaction = {
  id: 'txn-uuid-001',
  idempotency_key: 'idem-key-001',
  from_account_id: 'aaaa-1111-sender',
  to_account_id: 'bbbb-2222-recipient',
  amount: 50000,
  currency: 'INR',
  status: 'completed',
  fraud_score: 8,
  fraud_action: 'approve',
};

const mockFraudResult = {
  data: {
    data: {
      score: 8,
      action: 'approve',
      signals: [],
    },
  },
};

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: locks acquired successfully
    (acquireAccountLocks as Mock).mockResolvedValue({
      acquired: true,
      lockKeys: ['lock:aaaa', 'lock:bbbb'],
    });

    // Default: fraud check passes
    (axios.post as Mock).mockResolvedValue(mockFraudResult);

    // Default: sender account exists (for fraud check pre-query)
    (db as unknown as Mock).mockReturnValue({
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(mockFromAccount),
      }),
    });
  });

  describe('initiatePayment', () => {

    it('returns cached result without touching DB when idempotency key exists', async () => {
      // Arrange
      const cached = { id: 'txn-cached', status: 'completed', amount: 50000 };
      (idempotencyService.get as Mock).mockResolvedValue(cached);

      // Act
      const result = await paymentService.initiatePayment(baseParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(cached);
      // Critical: DB was never touched
      expect(acquireAccountLocks).not.toHaveBeenCalled();
      expect(paymentRepository.create).not.toHaveBeenCalled();
    });

    it('throws VALIDATION_ERROR when amount is below minimum', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);

      // Act + Assert
      await expect(
        paymentService.initiatePayment({ ...baseParams, amount: 10 })
      ).rejects.toThrow();
    });

    it('throws VALIDATION_ERROR when sender and recipient are the same', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);

      // Act + Assert
      await expect(
        paymentService.initiatePayment({
          ...baseParams,
          toAccountId: baseParams.fromAccountId,
        })
      ).rejects.toThrow('Cannot transfer to the same account');
    });

    it('throws ACCOUNT_LOCKED when locks cannot be acquired', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (acquireAccountLocks as Mock).mockResolvedValue({
        acquired: false,
        lockKeys: [],
      });

      // Act + Assert
      await expect(
        paymentService.initiatePayment(baseParams)
      ).rejects.toThrow('Account is busy');
    });

    it('throws FRAUD_BLOCKED when fraud score triggers decline', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (axios.post as Mock).mockResolvedValue({
        data: { data: { score: 95, action: 'decline', signals: [{ ruleName: 'VELOCITY_CHECK' }] } },
      });

      // Act + Assert
      await expect(
        paymentService.initiatePayment(baseParams)
      ).rejects.toThrow('declined by risk engine');

      // Should publish fraud blocked event
      expect(publishEvent).toHaveBeenCalledWith(
        'payment.fraud_blocked',
        expect.objectContaining({ fraudScore: 95 }),
        baseParams.traceId
      );
    });

    it('completes transfer successfully with all 17 steps', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);

      const mockTrx = {};
      (db.transaction as Mock).mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => {
        return cb(mockTrx);
      });

      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(mockToAccount);

      (paymentRepository.updateBalance as Mock).mockResolvedValue(1);
      (paymentRepository.creditAccount as Mock).mockResolvedValue(undefined);
      (paymentRepository.create as Mock).mockResolvedValue(mockTransaction);
      (ledgerService.createEntries as Mock).mockResolvedValue(undefined);
      (idempotencyService.set as Mock).mockResolvedValue(undefined);
      (publishEvent as Mock).mockResolvedValue(undefined);

      // Act
      const result = await paymentService.initiatePayment(baseParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);

      // Locks acquired
      expect(acquireAccountLocks).toHaveBeenCalledWith(
        baseParams.fromAccountId, baseParams.toAccountId, 10
      );

      // Both accounts locked in DB
      expect(paymentRepository.lockAccount).toHaveBeenCalledTimes(2);

      // Sender debited with optimistic lock
      expect(paymentRepository.updateBalance).toHaveBeenCalledWith(
        mockTrx, baseParams.fromAccountId, 50000, 1
      );

      // Recipient credited
      expect(paymentRepository.creditAccount).toHaveBeenCalledWith(
        mockTrx, baseParams.toAccountId, 70000, 3
      );

      // Ledger entries created with correct before/after balances
      expect(ledgerService.createEntries).toHaveBeenCalledWith(
        mockTrx,
        expect.objectContaining({
          transactionId: 'txn-uuid-001',
          amount: 50000,
          fromBalanceBefore: 100000,
          fromBalanceAfter: 50000,
          toBalanceBefore: 20000,
          toBalanceAfter: 70000,
        })
      );

      // Idempotency cached
      expect(idempotencyService.set).toHaveBeenCalled();

      // Kafka event published AFTER commit
      expect(publishEvent).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({ transactionId: 'txn-uuid-001' }),
        baseParams.traceId
      );

      // Locks released
      expect(releaseAllLocks).toHaveBeenCalled();
    });

    it('throws INSUFFICIENT_BALANCE when sender balance is too low', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);
      const poorAccount = { ...mockFromAccount, balance: 100 };

      (db.transaction as Mock).mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => cb({}));
      (paymentRepository.lockAccount as Mock)
        .mockResolvedValueOnce(poorAccount)
        .mockResolvedValueOnce(mockToAccount);

      // Act + Assert
      await expect(
        paymentService.initiatePayment(baseParams)
      ).rejects.toThrow(/need \d+ but have \d+/);

      // Locks must still be released via finally
      expect(releaseAllLocks).toHaveBeenCalled();
    });

    it('throws CONCURRENT_MODIFICATION when optimistic lock fails', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);

      // lockAccount must return valid accounts on EVERY retry attempt
      // (service retries up to 3 times on CONCURRENT_MODIFICATION)
      let lockCallCount = 0;
      (paymentRepository.lockAccount as Mock).mockReset();
      (paymentRepository.lockAccount as Mock).mockImplementation(() => {
        const isFrom = lockCallCount % 2 === 0;
        lockCallCount++;
        return Promise.resolve(isFrom ? mockFromAccount : mockToAccount);
      });

      (db.transaction as Mock).mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => cb({}));

      // 0 rows updated = version mismatch on EVERY attempt
      (paymentRepository.updateBalance as Mock).mockResolvedValue(0);

      // Act + Assert — after 3 retries, throws "Failed after retries"
      await expect(
        paymentService.initiatePayment(baseParams)
      ).rejects.toThrow(/Failed after retries|Concurrent modification/);
    });

    it('always releases locks even when an error occurs', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (db.transaction as Mock).mockRejectedValue(new Error('DB exploded'));

      // Act + Assert
      await expect(
        paymentService.initiatePayment(baseParams)
      ).rejects.toThrow();

      // Lock release must happen in finally block
      expect(releaseAllLocks).toHaveBeenCalled();
    });
  });
});
