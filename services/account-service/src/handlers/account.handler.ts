// Account handler — HTTP layer only. Delegates to accountService, returns IApiResponse.
import type { Request, Response, NextFunction } from 'express';
import { accountService } from '../services/account.service';
import type { IApiResponse } from '@settlr/types';

// Helper to build a uniform API response
function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

// POST / — Create a new account for the authenticated user
export async function createAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currency } = req.body;
    const result = await accountService.createAccount(req.userId!, currency);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET / — List all accounts for the authenticated user
export async function listAccountsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountService.listAccounts(req.userId!);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /lookup?q=email — Search for account by user email (for send money recipient)
export async function lookupAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req.query.q as string) || '';
    const result = await accountService.lookupAccount(query, req.userId!);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /stats/weekly — 7-day sent/received chart data
export async function getWeeklyStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountService.getWeeklyStats(req.userId!);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /:accountId — Get single account with balance
export async function getAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountService.getAccount(req.params.accountId, req.userId!);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /:accountId/transactions — Paginated transaction history
export async function getTransactionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accountId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await accountService.getTransactions(accountId, req.userId!, page, limit);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /:accountId/ledger — Paginated ledger entries
export async function getLedgerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accountId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await accountService.getLedgerEntries(accountId, req.userId!, page, limit);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}
