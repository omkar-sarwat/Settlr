// Payment handler — HTTP layer only. Parses request, calls paymentService, returns IApiResponse.
import type { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { db } from '@settlr/database';
import type { IApiResponse } from '@settlr/types';

function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

function parseAmountInPaise(rawAmount: unknown): number | null {
  if (typeof rawAmount === 'string') {
    const trimmed = rawAmount.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.includes('.')) {
      const rupees = Number.parseFloat(trimmed);
      if (!Number.isFinite(rupees)) {
        return null;
      }
      return Math.round(rupees * 100);
    }

    const paise = Number.parseInt(trimmed, 10);
    return Number.isFinite(paise) ? paise : null;
  }

  if (typeof rawAmount === 'number') {
    if (!Number.isFinite(rawAmount)) {
      return null;
    }

    if (Number.isInteger(rawAmount)) {
      return rawAmount;
    }

    return Math.round(rawAmount * 100);
  }

  return null;
}

// POST /payments — Initiate a new transfer
export async function initiatePaymentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedAmountInPaise = parseAmountInPaise(req.body.amount);
    if (parsedAmountInPaise === null || !Number.isInteger(parsedAmountInPaise) || parsedAmountInPaise <= 0) {
      respond(res, 400, {
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be a positive integer in paise',
      }, req.traceId!);
      return;
    }
    const amountInPaise: number = parsedAmountInPaise;

    const result = await paymentService.initiatePayment({
      idempotencyKey: req.headers['x-idempotency-key'] as string,
      fromAccountId: req.body.fromAccountId,
      toAccountId: req.body.toAccountId,
      amount: amountInPaise,
      currency: req.body.currency || 'INR',
      description: req.body.description,
      userId: req.userId!,
      traceId: req.traceId!,
    });

    const statusCode = result.fromCache ? 200 : result.statusCode || 201;
    if (result.fromCache) {
      res.setHeader('X-Idempotency-Replayed', 'true');
    }
    const txn = result.data as unknown as Record<string, unknown>;
    const meta = txn?.metadata as Record<string, unknown> | undefined;
    const data = { ...txn, description: meta?.description ?? null };
    respond(res, statusCode, { success: true, data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /payments/:transactionId — Get transaction details with fraud signals
export async function getTransactionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentService.getTransaction(req.params.transactionId, req.userId!);
    respond(res, result.statusCode || 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /payments/transactions/:transactionId/details — combined transaction + ledger + fraud signals
export async function getTransactionDetailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentService.getTransactionDetails(req.params.transactionId, req.userId!);
    respond(res, result.statusCode || 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /payments — List transactions with pagination, filters, user-name resolution
export async function listTransactionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const offset = (page - 1) * limit;
    const userId = req.userId!;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const period = req.query.period as string | undefined;

    // Get user's accounts so we can determine sent/received
    const userAccounts = await db('accounts').where({ user_id: userId }).select('id');
    const accountIds = userAccounts.map((a: { id: string }) => a.id);

    if (accountIds.length === 0) {
      respond(res, 200, {
        success: true,
        data: { transactions: [], total: 0, limit, page, totalPages: 0 },
      }, req.traceId!);
      return;
    }

    // Build query — transactions where user is sender or receiver
    let query = db('transactions as t')
      .leftJoin('accounts as fa', 't.from_account_id', 'fa.id')
      .leftJoin('accounts as ta', 't.to_account_id', 'ta.id')
      .leftJoin('users as fu', 'fa.user_id', 'fu.id')
      .leftJoin('users as tu', 'ta.user_id', 'tu.id')
      .where(function () {
        this.whereIn('t.from_account_id', accountIds)
          .orWhereIn('t.to_account_id', accountIds);
      });

    // Filter by type (sent / received)
    if (type === 'sent') {
      query = query.andWhere(function () {
        this.whereIn('t.from_account_id', accountIds);
      });
    } else if (type === 'received') {
      query = query.andWhere(function () {
        this.whereIn('t.to_account_id', accountIds);
      });
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.andWhere('t.status', status);
    }

    // Filter by period
    if (period && period !== 'all') {
      const now = new Date();
      let since: Date;
      if (period === 'today') {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        since = new Date(0);
      }
      query = query.andWhere('t.created_at', '>=', since.toISOString());
    }

    // Search by description or user name
    if (search) {
      query = query.andWhere(function () {
        this.whereRaw("t.metadata->>'description' ILIKE ?", [`%${search}%`])
          .orWhereRaw('fu.name ILIKE ?', [`%${search}%`])
          .orWhereRaw('tu.name ILIKE ?', [`%${search}%`])
          .orWhereRaw('fu.email ILIKE ?', [`%${search}%`])
          .orWhereRaw('tu.email ILIKE ?', [`%${search}%`]);
      });
    }

    // Clone for count before pagination
    const countResult = await query.clone().clearSelect().clearOrder().count('t.id as count').first() as { count: string } | undefined;
    const total = parseInt(countResult?.count || '0', 10);

    // Fetch with pagination
    const rows = await query
      .select(
        't.id',
        't.from_account_id as fromAccountId',
        't.to_account_id as toAccountId',
        't.amount',
        't.currency',
        't.status',
        't.fraud_score as fraudScore',
        't.fraud_action as fraudAction',
        't.failure_reason as failureReason',
        't.metadata',
        't.created_at as createdAt',
        't.updated_at as updatedAt',
        db.raw("COALESCE(fu.name, fu.email, 'Unknown') as \"fromUserName\""),
        db.raw("COALESCE(tu.name, tu.email, 'Unknown') as \"toUserName\""),
      )
      .orderBy('t.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Map metadata.description to top-level
    interface TransactionRow {
      id: string;
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      currency: string;
      status: string;
      fraudScore: number;
      fraudAction: string;
      failureReason: string | null;
      metadata: { description?: string } | null;
      createdAt: string;
      updatedAt: string;
      fromUserName: string;
      toUserName: string;
    }
    const transactions = (rows as TransactionRow[]).map((row) => ({
      ...row,
      description: row.metadata?.description || null,
    }));

    const totalPages = Math.ceil(total / limit);

    respond(res, 200, {
      success: true,
      data: { transactions, total, limit, page, totalPages },
    }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /payments/metrics — Aggregate system metrics for admin dashboard
export async function getMetricsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Total volume today (completed)
    const [volRow] = await db('transactions')
      .where('status', 'completed')
      .andWhere('created_at', '>=', todayStart.toISOString())
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    const totalVolumeToday = Number(volRow.total);

    // Success rate (all time)
    const [rateRow] = await db('transactions')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed"),
        db.raw("COUNT(*) FILTER (WHERE fraud_action = 'decline') as fraud_blocked"),
      );

    const totalTx = Number(rateRow.total) || 1;
    const successRate = Math.round((Number(rateRow.completed) / totalTx) * 10000) / 100;
    const fraudBlockRate = Math.round((Number(rateRow.fraud_blocked) / totalTx) * 10000) / 100;

    // Transaction throughput — hourly buckets over last 24 hours (gives real chart data)
    const tpmRows = await db('transactions')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .select(
        db.raw("date_trunc('hour', created_at) as bucket"),
        db.raw('COUNT(*) as count'),
      )
      .groupByRaw("date_trunc('hour', created_at)")
      .orderBy('bucket', 'asc');

    const transactionsPerMinute = (tpmRows as Array<{ bucket: string; count: string }>).map((r) => ({
      timestamp: r.bucket,
      count: Number(r.count),
    }));

    // Signal breakdown from fraud_signals — keyed as "ruleName" for frontend compatibility
    const signalRows = await db('fraud_signals')
      .select('rule_name as ruleName', db.raw('COUNT(*) as count'))
      .groupBy('rule_name')
      .orderBy('count', 'desc');

    const signalBreakdown = (signalRows as Array<{ ruleName: string; count: string }>).map((r) => ({
      ruleName: r.ruleName,
      count: Number(r.count),
    }));

    // ── Latency metrics — P50, P95, P99 from completed transactions (last 24h) ──
    const [latencyRow] = await db('transactions')
      .where('status', 'completed')
      .andWhere('created_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .select(
        db.raw('COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0) as avg_ms'),
        db.raw('COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0) as p50_ms'),
        db.raw('COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0) as p95_ms'),
        db.raw('COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0) as p99_ms'),
      );
    const avgLatencyMs = Math.round(Number(latencyRow.avg_ms));
    const p50LatencyMs = Math.round(Number(latencyRow.p50_ms));
    const p95LatencyMs = Math.round(Number(latencyRow.p95_ms));
    const p99LatencyMs = Math.round(Number(latencyRow.p99_ms));

    // ── Total transaction count + total volume all-time (impressive numbers) ──
    const [totalsRow] = await db('transactions')
      .where('status', 'completed')
      .select(
        db.raw('COUNT(*) as total_count'),
        db.raw('COALESCE(SUM(amount), 0) as total_volume'),
      );
    const totalTransactions = Number(totalsRow.total_count);
    const totalVolume = Number(totalsRow.total_volume);

    // ── Active users today (unique users who sent or received) ──
    const [activeRow] = await db('transactions')
      .where('created_at', '>=', todayStart.toISOString())
      .join('accounts as fa', 'transactions.from_account_id', 'fa.id')
      .join('accounts as ta', 'transactions.to_account_id', 'ta.id')
      .select(db.raw('COUNT(DISTINCT fa.user_id) + COUNT(DISTINCT ta.user_id) as active_users'));
    const activeUsersToday = Number(activeRow.active_users);

    respond(res, 200, {
      success: true,
      data: {
        totalVolumeToday,
        successRate,
        fraudBlockRate,
        avgLatencyMs,
        p50LatencyMs,
        p95LatencyMs,
        p99LatencyMs,
        transactionsPerMinute,
        signalBreakdown,
        totalTransactions,
        totalVolume,
        activeUsersToday,
      },
    }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /payments/dashboard-stats?accountId=xxx — Today's stats for a specific account
export async function getDashboardStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      respond(res, 400, { success: false, error: 'accountId query parameter required' }, req.traceId!);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Sent today (completed, from this account)
    const [sentRow] = await db('transactions')
      .where('from_account_id', accountId)
      .andWhere('status', 'completed')
      .andWhere('created_at', '>=', todayISO)
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    // Received today (completed, to this account)
    const [receivedRow] = await db('transactions')
      .where('to_account_id', accountId)
      .andWhere('status', 'completed')
      .andWhere('created_at', '>=', todayISO)
      .select(db.raw('COALESCE(SUM(amount), 0) as total'));

    // Personal success rate (for this account, all time)
    const [rateRow] = await db('transactions')
      .where((builder) => {
        builder.where('from_account_id', accountId).orWhere('to_account_id', accountId);
      })
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed"),
      );

    const totalTx = Number(rateRow.total) || 1;
    const successRate = Math.round((Number(rateRow.completed) / totalTx) * 10000) / 100;

    respond(res, 200, {
      success: true,
      data: {
        sentToday: Number(sentRow.total),
        receivedToday: Number(receivedRow.total),
        successRate,
      },
    }, req.traceId!);
  } catch (err) {
    next(err);
  }
}
