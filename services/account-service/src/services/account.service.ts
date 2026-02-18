// Account service — business logic for account creation, lookup, and history
import { logger } from '@settlr/logger';
import { accountRepository } from '../repositories/account.repository';
import { toCamelCase } from '@settlr/types';
import type { IAccount, IResult, ITransaction, ILedgerEntry, IPaginatedResponse } from '@settlr/types';
import { AppError, ErrorCodes } from '@settlr/types/errors';

export const accountService = {
  // Create a new account for the authenticated user
  async createAccount(userId: string, currency: 'INR' = 'INR'): Promise<IResult<IAccount>> {
    const row = await accountRepository.create(userId, currency);
    const account = toCamelCase(row as unknown as Record<string, unknown>) as unknown as IAccount;

    logger.info('account_created', { userId, accountId: account.id });
    return { success: true, data: account, statusCode: 201 };
  },

  // List all accounts for the authenticated user
  async listAccounts(userId: string): Promise<IResult<IAccount[]>> {
    const rows = await accountRepository.findByUserId(userId);
    const accounts = rows.map((r) => toCamelCase(r as unknown as Record<string, unknown>) as unknown as IAccount);
    return { success: true, data: accounts, statusCode: 200 };
  },

  // Get a single account by ID (must belong to the user)
  async getAccount(accountId: string, userId: string): Promise<IResult<IAccount>> {
    const row = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!row) {
      throw AppError.notFound('Account', accountId);
    }
    return { success: true, data: toCamelCase(row as unknown as Record<string, unknown>) as unknown as IAccount, statusCode: 200 };
  },

  // Get paginated transactions for an account
  async getTransactions(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IResult<IPaginatedResponse<ITransaction>>> {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { items, total } = await accountRepository.getTransactions(accountId, page, safeLimit);
    const transactions = items.map((r) => toCamelCase(r as unknown as Record<string, unknown>) as unknown as ITransaction);
    const totalPages = Math.ceil(total / safeLimit);

    return {
      success: true,
      statusCode: 200,
      data: {
        items: transactions,
        total,
        page,
        limit: safeLimit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  // Get paginated ledger entries for an account
  async getLedgerEntries(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IResult<IPaginatedResponse<ILedgerEntry>>> {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { items, total } = await accountRepository.getLedgerEntries(accountId, page, safeLimit);
    const entries = items.map((r) => toCamelCase(r as unknown as Record<string, unknown>) as unknown as ILedgerEntry);
    const totalPages = Math.ceil(total / safeLimit);

    return {
      success: true,
      statusCode: 200,
      data: {
        items: entries,
        total,
        page,
        limit: safeLimit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  // Lookup account by email or account ID for send money recipient search
  async lookupAccount(query: string, currentUserId: string): Promise<IResult<{ id: string; name: string | null; email: string; accountId: string } | null>> {
    if (!query || query.length < 3) {
      return { success: true, data: null, statusCode: 200 };
    }

    const row = await accountRepository.lookupByEmail(query);
    if (!row || row.user_id === currentUserId) {
      return { success: true, data: null, statusCode: 200 };
    }

    return {
      success: true,
      statusCode: 200,
      data: {
        id: row.user_id,
        name: row.name || null,
        email: row.email,
        accountId: row.id,
      },
    };
  },

  // Get 7-day sent/received stats for charts
  async getWeeklyStats(userId: string): Promise<IResult<Array<{ date: string; sent: number; received: number }>>> {
    const stats = await accountRepository.getWeeklyStats(userId);
    return { success: true, data: stats, statusCode: 200 };
  },
};
