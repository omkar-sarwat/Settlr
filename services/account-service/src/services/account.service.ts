// Account service — business logic for account creation, lookup, and history
import { logger } from '@settlr/logger';
import { redis } from '@settlr/redis';
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

  // Get paginated transactions for an account.
  //
  // PERF — parallel auth + data (saves 1 full DB round-trip, ~150–200ms per call):
  //   Sequential (old): auth(200ms) → data+count(200ms) = 400ms
  //   Parallel  (new):  auth + data concurrently   = 200ms
  //
  // PERF — page-1 Redis cache (5-second TTL):
  //   Cache hit: Redis GET (~150ms) instead of DB round-trips (~400ms)
  //   Cache is busted on every payment completion by payment-service.
  //   TTL of 5s is fintech-safe: balance is always read from DB (authoritative),
  //   only the read-only history page is cached.
  //
  // SAFETY: If auth fails we throw AFTER discarding data — data never reaches caller.
  async getTransactions(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IResult<IPaginatedResponse<ITransaction>>> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const cacheKey = `cache:txns:${accountId}:${page}:${safeLimit}`;

    if (page === 1) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Still validate ownership before serving cache — prevents account enumeration
        const account = await accountRepository.findByIdAndUserId(accountId, userId);
        if (!account) throw AppError.notFound('Account', accountId);
        return { success: true, statusCode: 200, data: JSON.parse(cached) as IPaginatedResponse<ITransaction> };
      }
    }

    // Run ownership check in parallel with data fetch — saves one full network RTT
    const [account, { items, total }] = await Promise.all([
      accountRepository.findByIdAndUserId(accountId, userId),
      accountRepository.getTransactions(accountId, page, safeLimit),
    ]);

    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    const transactions = items.map((r) => toCamelCase(r as unknown as Record<string, unknown>) as unknown as ITransaction);
    const totalPages = Math.ceil(total / safeLimit);
    const data: IPaginatedResponse<ITransaction> = {
      items: transactions,
      total,
      page,
      limit: safeLimit,
      totalPages,
      hasMore: page < totalPages,
    };

    // Cache page 1 asynchronously — fire-and-forget, never blocks the response
    if (page === 1) {
      redis.setex(cacheKey, 5, JSON.stringify(data)).catch(() => {});
    }

    return { success: true, statusCode: 200, data };
  },

  // Get paginated ledger entries for an account.
  // Same parallel-auth + page-1-cache strategy as getTransactions above.
  async getLedgerEntries(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IResult<IPaginatedResponse<ILedgerEntry>>> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const cacheKey = `cache:ledger:${accountId}:${page}:${safeLimit}`;

    if (page === 1) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const account = await accountRepository.findByIdAndUserId(accountId, userId);
        if (!account) throw AppError.notFound('Account', accountId);
        return { success: true, statusCode: 200, data: JSON.parse(cached) as IPaginatedResponse<ILedgerEntry> };
      }
    }

    const [account, { items, total }] = await Promise.all([
      accountRepository.findByIdAndUserId(accountId, userId),
      accountRepository.getLedgerEntries(accountId, page, safeLimit),
    ]);

    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    const entries = items.map((r) => toCamelCase(r as unknown as Record<string, unknown>) as unknown as ILedgerEntry);
    const totalPages = Math.ceil(total / safeLimit);
    const data: IPaginatedResponse<ILedgerEntry> = {
      items: entries,
      total,
      page,
      limit: safeLimit,
      totalPages,
      hasMore: page < totalPages,
    };

    if (page === 1) {
      redis.setex(cacheKey, 5, JSON.stringify(data)).catch(() => {});
    }

    return { success: true, statusCode: 200, data };
  },

  // Lookup accounts by name, email, or account ID for send money recipient search
  async lookupAccount(query: string, currentUserId: string): Promise<IResult<Array<{ id: string; name: string | null; email: string; accountId: string }>>> {
    if (!query || query.length < 2) {
      return { success: true, data: [], statusCode: 200 };
    }

    const rows = await accountRepository.lookupByQuery(query);
    const results = rows
      .filter((row) => row.user_id !== currentUserId)
      .map((row) => ({
        id: row.user_id,
        name: row.name || null,
        email: row.email,
        accountId: row.id,
      }));

    return { success: true, data: results, statusCode: 200 };
  },

  // Get 7-day sent/received stats for charts
  async getWeeklyStats(userId: string): Promise<IResult<Array<{ date: string; sent: number; received: number }>>> {
    const stats = await accountRepository.getWeeklyStats(userId);
    return { success: true, data: stats, statusCode: 200 };
  },

  async getAccountStats(accountId: string, userId: string): Promise<IResult<{
    balance: number;
    sentToday: number;
    receivedToday: number;
    successRate: number;
    weeklyChange: number;
  }>> {
    // PERF: Run auth check and Redis cache lookup in parallel — saves one serial RTT (~150ms)
    // On a cache HIT the total latency is max(DB_RTT, Redis_RTT) instead of DB_RTT + Redis_RTT.
    const cacheKey = `cache:stats:${accountId}`;
    const [account, cached] = await Promise.all([
      accountRepository.findByIdAndUserId(accountId, userId),
      redis.get(cacheKey),
    ]);

    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    if (cached) {
      return {
        success: true,
        statusCode: 200,
        data: JSON.parse(cached) as {
          balance: number;
          sentToday: number;
          receivedToday: number;
          successRate: number;
          weeklyChange: number;
        },
      };
    }

    const [balance, sentToday, receivedToday, successRate, weeklyChange] = await Promise.all([
      accountRepository.getAccountBalance(accountId),
      accountRepository.getSentToday(accountId),
      accountRepository.getReceivedToday(accountId),
      accountRepository.getSuccessRate30d(accountId),
      accountRepository.getWeeklyChange(accountId),
    ]);

    const stats = { balance, sentToday, receivedToday, successRate, weeklyChange };
    await redis.setex(cacheKey, 60, JSON.stringify(stats));

    return { success: true, statusCode: 200, data: stats };
  },

  async getAccountChart(accountId: string, userId: string, days: number): Promise<IResult<Array<{ day: string; sent: number; received: number }>>> {
    const safeDays = Math.min(Math.max(days, 1), 30);
    const cacheKey = `cache:chart:${accountId}:${safeDays}`;

    // PERF: Parallel auth + cache — same pattern as getAccountStats
    const [account, cached] = await Promise.all([
      accountRepository.findByIdAndUserId(accountId, userId),
      redis.get(cacheKey),
    ]);

    if (!account) {
      throw AppError.notFound('Account', accountId);
    }

    if (cached) {
      return {
        success: true,
        statusCode: 200,
        data: JSON.parse(cached) as Array<{ day: string; sent: number; received: number }>,
      };
    }

    const chart = await accountRepository.getChartData(accountId, safeDays);
    await redis.setex(cacheKey, 300, JSON.stringify(chart));

    return { success: true, statusCode: 200, data: chart };
  },
};
