// Unit tests for account.service.ts — CRUD operations, authorization, pagination
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock dependencies ──────────────────────────────────────────────────────
vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/types', async () => {
  const actual = await vi.importActual<typeof import('@settlr/types')>('@settlr/types');
  return {
    ...actual,
    toCamelCase: vi.fn((obj: Record<string, unknown>) => {
      // Simple snake_case → camelCase for tests
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        result[camelKey] = value;
      }
      return result;
    }),
  };
});

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
  return { AppError: MockAppError, ErrorCodes: { NOT_FOUND: 'NOT_FOUND' } };
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

import { accountService } from '../../src/services/account.service';
import { accountRepository } from '../../src/repositories/account.repository';

// ── Test data factories ────────────────────────────────────────────────────
const userId = 'user-uuid-123';
const accountId = 'acc-uuid-456';

const mockAccountRow = {
  id: accountId,
  user_id: userId,
  balance: 500000,
  currency: 'INR',
  status: 'active',
  version: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const mockTxRow = {
  id: 'tx-uuid-789',
  from_account_id: accountId,
  to_account_id: 'acc-other',
  amount: 100000,
  status: 'completed',
  created_at: '2026-01-10T00:00:00Z',
};

describe('accountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createAccount ──────────────────────────────────────────────────────
  describe('createAccount', () => {
    it('should create an account and return 201', async () => {
      (accountRepository.create as Mock).mockResolvedValue(mockAccountRow);

      const result = await accountService.createAccount(userId, 'INR');

      expect(accountRepository.create).toHaveBeenCalledWith(userId, 'INR');
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data?.id).toBe(accountId);
    });

    it('should default currency to INR', async () => {
      (accountRepository.create as Mock).mockResolvedValue(mockAccountRow);

      await accountService.createAccount(userId);

      expect(accountRepository.create).toHaveBeenCalledWith(userId, 'INR');
    });
  });

  // ── listAccounts ───────────────────────────────────────────────────────
  describe('listAccounts', () => {
    it('should return all accounts for the user', async () => {
      (accountRepository.findByUserId as Mock).mockResolvedValue([mockAccountRow, { ...mockAccountRow, id: 'acc-2' }]);

      const result = await accountService.listAccounts(userId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.statusCode).toBe(200);
    });

    it('should return empty array when user has no accounts', async () => {
      (accountRepository.findByUserId as Mock).mockResolvedValue([]);

      const result = await accountService.listAccounts(userId);

      expect(result.data).toHaveLength(0);
    });
  });

  // ── getAccount ─────────────────────────────────────────────────────────
  describe('getAccount', () => {
    it('should return single account if it belongs to user', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);

      const result = await accountService.getAccount(accountId, userId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(accountId);
      expect(result.statusCode).toBe(200);
    });

    it('should throw AppError.notFound if account doesnt exist', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(undefined);

      await expect(accountService.getAccount('bad-id', userId)).rejects.toThrow(/not found/);
    });
  });

  // ── getTransactions ────────────────────────────────────────────────────
  describe('getTransactions', () => {
    it('should return paginated transactions for given account', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getTransactions as Mock).mockResolvedValue({
        items: [mockTxRow],
        total: 1,
      });

      const result = await accountService.getTransactions(accountId, userId, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
      expect(result.data?.hasMore).toBe(false);
    });

    it('should throw if account doesnt belong to user', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(undefined);

      await expect(accountService.getTransactions(accountId, userId)).rejects.toThrow(/not found/);
    });

    it('should clamp limit between 1 and 100', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getTransactions as Mock).mockResolvedValue({ items: [], total: 0 });

      await accountService.getTransactions(accountId, userId, 1, 999);

      // limit should be clamped to 100
      expect(accountRepository.getTransactions).toHaveBeenCalledWith(accountId, 1, 100);
    });

    it('should correctly compute hasMore and totalPages', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getTransactions as Mock).mockResolvedValue({
        items: Array(10).fill(mockTxRow),
        total: 25,
      });

      const result = await accountService.getTransactions(accountId, userId, 1, 10);

      expect(result.data?.totalPages).toBe(3);              // ceil(25/10)
      expect(result.data?.hasMore).toBe(true);               // page 1 < 3
    });
  });

  // ── getLedgerEntries ───────────────────────────────────────────────────
  describe('getLedgerEntries', () => {
    it('should return paginated ledger entries', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(mockAccountRow);
      (accountRepository.getLedgerEntries as Mock).mockResolvedValue({
        items: [{ id: 'ledger-1', account_id: accountId, type: 'debit', amount: 50000 }],
        total: 1,
      });

      const result = await accountService.getLedgerEntries(accountId, userId, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.totalPages).toBe(1);
    });

    it('should throw if account doesnt belong to user', async () => {
      (accountRepository.findByIdAndUserId as Mock).mockResolvedValue(undefined);

      await expect(accountService.getLedgerEntries(accountId, userId)).rejects.toThrow(/not found/);
    });
  });
});
