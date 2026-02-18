// Account repository — all SQL queries for the accounts table. No business logic.
import { db } from '@settlr/database';
import type { IAccountRow, ITransactionRow, ILedgerEntryRow } from '@settlr/types';

export const accountRepository = {
  // Insert a new account row and return it
  async create(userId: string, currency: string): Promise<IAccountRow> {
    const [row] = await db('accounts')
      .insert({ user_id: userId, currency, balance: 0, version: 0 })
      .returning('*');
    return row;
  },

  // Find one account by ID
  async findById(accountId: string): Promise<IAccountRow | undefined> {
    return db('accounts').where({ id: accountId }).first();
  },

  // Find all accounts belonging to a user
  async findByUserId(userId: string): Promise<IAccountRow[]> {
    return db('accounts').where({ user_id: userId }).orderBy('created_at', 'desc');
  },

  // Find account by ID and verify it belongs to the given user
  async findByIdAndUserId(accountId: string, userId: string): Promise<IAccountRow | undefined> {
    return db('accounts').where({ id: accountId, user_id: userId }).first();
  },

  // Get paginated transactions for an account (sent or received)
  async getTransactions(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ items: ITransactionRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const [items, [{ count }]] = await Promise.all([
      db('transactions')
        .where('from_account_id', accountId)
        .orWhere('to_account_id', accountId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('transactions')
        .where('from_account_id', accountId)
        .orWhere('to_account_id', accountId)
        .count('* as count'),
    ]);

    return { items, total: Number(count) };
  },

  // Get paginated ledger entries for an account
  async getLedgerEntries(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ items: ILedgerEntryRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const [items, [{ count }]] = await Promise.all([
      db('ledger_entries')
        .where({ account_id: accountId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('ledger_entries')
        .where({ account_id: accountId })
        .count('* as count'),
    ]);

    return { items, total: Number(count) };
  },

  // Lookup account by user email — joins accounts + users for recipient search
  async lookupByEmail(email: string): Promise<{ id: string; user_id: string; email: string; name: string | null } | undefined> {
    return db('accounts')
      .join('users', 'accounts.user_id', 'users.id')
      .where('users.email', email)
      .andWhere('users.is_active', true)
      .andWhere('accounts.status', 'active')
      .select('accounts.id', 'accounts.user_id', 'users.email', 'users.name')
      .first();
  },

  // Get 7-day sent/received aggregate stats for a user's accounts
  async getWeeklyStats(userId: string): Promise<Array<{ date: string; sent: number; received: number }>> {
    const accounts = await db('accounts').where({ user_id: userId }).select('id');
    const accountIds = accounts.map((a: { id: string }) => a.id);

    if (accountIds.length === 0) {
      return [];
    }

    // Generate last 7 days
    const days: Array<{ date: string; sent: number; received: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split('T')[0], sent: 0, received: 0 });
    }

    // Sent totals
    const sentRows = await db('transactions')
      .whereIn('from_account_id', accountIds)
      .where('status', 'completed')
      .where('created_at', '>=', days[0].date)
      .select(db.raw("DATE(created_at) as date, SUM(amount) as total"))
      .groupByRaw('DATE(created_at)');

    // Received totals
    const receivedRows = await db('transactions')
      .whereIn('to_account_id', accountIds)
      .where('status', 'completed')
      .where('created_at', '>=', days[0].date)
      .select(db.raw("DATE(created_at) as date, SUM(amount) as total"))
      .groupByRaw('DATE(created_at)');

    for (const row of sentRows) {
      const day = days.find((d) => d.date === row.date?.toISOString?.().split('T')[0] || row.date);
      if (day) day.sent = Number(row.total);
    }

    for (const row of receivedRows) {
      const day = days.find((d) => d.date === row.date?.toISOString?.().split('T')[0] || row.date);
      if (day) day.received = Number(row.total);
    }

    return days;
  },
};
