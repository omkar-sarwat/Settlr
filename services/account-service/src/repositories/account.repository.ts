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

  // Get paginated transactions for an account (sent or received).
  //
  // WHY UNION ALL instead of OR:
  //   WHERE from_account_id = $1 OR to_account_id = $1 forces a full bitmap heap scan
  //   across BOTH indexes, merging results in memory. UNION ALL lets PostgreSQL run two
  //   independent index range scans (one per arm) and concatenate — far cheaper.
  //   Uses: idx_transactions_from_account_created + idx_transactions_to_account_created
  //
  // WHY COUNT(*) OVER():
  //   A second COUNT(*) query would cost another full network RTT (~150ms to Supabase).
  //   Window function COUNT(*) OVER() is computed in the same query — total row count
  //   arrives with the first page at zero extra cost.
  async getTransactions(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ items: ITransactionRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const result = await db.raw<{ rows: Array<ITransactionRow & { total_count: string }> }>(
      `SELECT
         id, idempotency_key, from_account_id, to_account_id,
         amount, currency, status, fraud_score, fraud_action,
         failure_reason, metadata, created_at, updated_at,
         COUNT(*) OVER() AS total_count
       FROM (
         SELECT id, idempotency_key, from_account_id, to_account_id,
                amount, currency, status, fraud_score, fraud_action,
                failure_reason, metadata, created_at, updated_at
           FROM transactions WHERE from_account_id = :accountId
         UNION ALL
         SELECT id, idempotency_key, from_account_id, to_account_id,
                amount, currency, status, fraud_score, fraud_action,
                failure_reason, metadata, created_at, updated_at
           FROM transactions WHERE to_account_id = :accountId
       ) combined
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { accountId, limit, offset }
    );

    const rows = result.rows;
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    // Strip the window-function helper column before returning domain rows
    const items = rows.map(({ total_count: _tc, ...rest }) => rest as unknown as ITransactionRow);
    return { items, total };
  },

  // Get paginated ledger entries for an account.
  //
  // Uses idx_ledger_account_created covering index (account_id, created_at DESC)
  // with INCLUDE(entry_type, amount, balance_before, balance_after) — the query
  // is served entirely from the index, no heap fetch needed.
  // COUNT(*) OVER() returns the total without a second round-trip.
  async getLedgerEntries(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ items: ILedgerEntryRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const result = await db.raw<{ rows: Array<ILedgerEntryRow & { total_count: string }> }>(
      `SELECT
         id, transaction_id, account_id, entry_type,
         amount, balance_before, balance_after, created_at,
         COUNT(*) OVER() AS total_count
       FROM ledger_entries
       WHERE account_id = :accountId
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { accountId, limit, offset }
    );

    const rows = result.rows;
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const items = rows.map(({ total_count: _tc, ...rest }) => rest as unknown as ILedgerEntryRow);
    return { items, total };
  },

  // Lookup account by name, email, or account ID — joins accounts + users for recipient search
  async lookupByQuery(query: string): Promise<Array<{ id: string; user_id: string; email: string; name: string | null }>> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    return db('accounts')
      .join('users', 'accounts.user_id', 'users.id')
      .where(function () {
        this.whereRaw('LOWER(users.email) LIKE ?', [`%${query.toLowerCase()}%`])
          .orWhereRaw('LOWER(users.name) LIKE ?', [`%${query.toLowerCase()}%`]);
        if (isUuid) {
          this.orWhere('accounts.id', query);
        }
      })
      .andWhere('users.is_active', true)
      .andWhere('accounts.status', 'active')
      .select('accounts.id', 'accounts.user_id', 'users.email', 'users.name')
      .limit(10);
  },

  // Get 7-day sent/received aggregate stats for a user's accounts
  async getWeeklyStats(userId: string): Promise<Array<{ date: string; sent: number; received: number }>> {
    const accounts = await db('accounts').where({ user_id: userId }).select('id');
    const accountIds = accounts.map((a: { id: string }) => a.id);

    if (accountIds.length === 0) {
      return [];
    }

    // Generate last 7 days (UTC)
    const days: Array<{ date: string; sent: number; received: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split('T')[0], sent: 0, received: 0 });
    }

    // Use to_char with UTC so the pg driver returns a plain string, avoiding timezone shift
    const dateExpr = "to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')";

    // Sent totals
    const sentRows = await db('transactions')
      .whereIn('from_account_id', accountIds)
      .where('status', 'completed')
      .where('created_at', '>=', days[0].date)
      .select(db.raw(`${dateExpr} as date, SUM(amount) as total`))
      .groupByRaw(dateExpr);

    // Received totals
    const receivedRows = await db('transactions')
      .whereIn('to_account_id', accountIds)
      .where('status', 'completed')
      .where('created_at', '>=', days[0].date)
      .select(db.raw(`${dateExpr} as date, SUM(amount) as total`))
      .groupByRaw(dateExpr);

    for (const row of sentRows) {
      const dateStr = String(row.date);
      const day = days.find((d) => d.date === dateStr);
      if (day) day.sent = Number(row.total);
    }

    for (const row of receivedRows) {
      const dateStr = String(row.date);
      const day = days.find((d) => d.date === dateStr);
      if (day) day.received = Number(row.total);
    }

    return days;
  },

  async getAccountBalance(accountId: string): Promise<number> {
    const row = await db('accounts').where({ id: accountId }).first('balance');
    return Number(row?.balance ?? 0);
  },

  async getSentToday(accountId: string): Promise<number> {
    const [row] = await db('transactions')
      .where({ from_account_id: accountId, status: 'completed' })
      .andWhereRaw('DATE(created_at) = CURRENT_DATE')
      .sum({ total: 'amount' });

    return Number((row as { total: string | number | null })?.total ?? 0);
  },

  async getReceivedToday(accountId: string): Promise<number> {
    const [row] = await db('transactions')
      .where({ to_account_id: accountId, status: 'completed' })
      .andWhereRaw('DATE(created_at) = CURRENT_DATE')
      .sum({ total: 'amount' });

    return Number((row as { total: string | number | null })?.total ?? 0);
  },

  async getSuccessRate30d(accountId: string): Promise<number> {
    const [row] = await db('transactions')
      .where({ from_account_id: accountId })
      .andWhereRaw("created_at >= NOW() - INTERVAL '30 days'")
      .select(
        db.raw("COUNT(*) FILTER (WHERE status = 'completed') as succeeded"),
        db.raw('COUNT(*) as total')
      );

    const succeeded = Number((row as { succeeded: string | number })?.succeeded ?? 0);
    const total = Number((row as { total: string | number })?.total ?? 0);

    if (total === 0) {
      return 0;
    }

    return Math.round((succeeded / total) * 1000) / 10;
  },

  async getWeeklyChange(accountId: string): Promise<number> {
    const [row] = await db('transactions')
      .where(function () {
        this.where('from_account_id', accountId).orWhere('to_account_id', accountId);
      })
      .andWhere({ status: 'completed' })
      .select(
        db.raw("COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as current_week"),
        db.raw("COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as previous_week")
      );

    const currentWeek = Number((row as { current_week: string | number })?.current_week ?? 0);
    const previousWeek = Number((row as { previous_week: string | number })?.previous_week ?? 0);

    if (previousWeek === 0) {
      return currentWeek > 0 ? 100 : 0;
    }

    return Math.round((((currentWeek - previousWeek) / previousWeek) * 100) * 10) / 10;
  },

  async getChartData(accountId: string, days: number): Promise<Array<{ day: string; sent: number; received: number }>> {
    const rows = await db('transactions')
      .where(function () {
        this.where('from_account_id', accountId).orWhere('to_account_id', accountId);
      })
      .andWhere('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .andWhere({ status: 'completed' })
      .select(
        db.raw("DATE(created_at AT TIME ZONE 'UTC') as tx_date"),
        db.raw('SUM(CASE WHEN from_account_id = ? THEN amount ELSE 0 END) as sent', [accountId]),
        db.raw('SUM(CASE WHEN to_account_id = ? THEN amount ELSE 0 END) as received', [accountId])
      )
      .groupByRaw("DATE(created_at AT TIME ZONE 'UTC')")
      .orderBy('tx_date', 'asc');

    const points = (rows as Array<{ tx_date: string | Date; sent: string | number; received: string | number }>).map((row) => {
      const dateValue = row.tx_date instanceof Date
        ? row.tx_date.toISOString().slice(0, 10)
        : String(row.tx_date).slice(0, 10);

      return {
        date: dateValue,
        sent: Number(row.sent ?? 0),
        received: Number(row.received ?? 0),
      };
    });

    const byDate = new Map(points.map((point) => [point.date, point]));
    const filled: Array<{ day: string; sent: number; received: number }> = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const iso = date.toISOString().slice(0, 10);
      const existing = byDate.get(iso);

      filled.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sent: existing?.sent ?? 0,
        received: existing?.received ?? 0,
      });
    }

    return filled;
  },
};
