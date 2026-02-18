// Fraud handler — HTTP endpoint for synchronous fraud checks from payment-service
import type { Request, Response, NextFunction } from 'express';
import { runFraudEngine } from '../engine/fraudEngine';
import { db } from '@settlr/database';
import { logger } from '@settlr/logger';
import type { IApiResponse, IFraudResult, IFraudInput } from '@settlr/types';

function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

// POST /fraud/check — Run all 6 fraud rules and return score + action + signals
export async function fraudCheckHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fromAccountId, toAccountId, amount, accountCreatedAt, traceId } = req.body;

    const input: IFraudInput = {
      fromAccountId,
      toAccountId,
      amount,
      accountCreatedAt: new Date(accountCreatedAt),
      traceId: traceId || req.traceId || 'unknown',
    };

    const result: IFraudResult = await runFraudEngine(input);

    // Store fraud signals in DB for audit trail (if there's a transaction later)
    logger.info('fraud_check_completed', {
      traceId: input.traceId,
      score: result.score,
      action: result.action,
      signalCount: result.signals.length,
      rules: result.signals.map((s) => s.ruleName),
    });

    respond(res, 200, { success: true, data: result }, input.traceId);
  } catch (err) {
    next(err);
  }
}

// Store fraud signals after a transaction is created (called separately)
export async function storeFraudSignalsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { transactionId, signals } = req.body;

    if (signals && signals.length > 0) {
      const rows = signals.map((s: { ruleName: string; scoreAdded: number; signalData: Record<string, unknown> }) => ({
        transaction_id: transactionId,
        rule_name: s.ruleName,
        score_added: s.scoreAdded,
        signal_data: s.signalData || {},
      }));
      await db('fraud_signals').insert(rows);
    }

    respond(res, 201, { success: true }, req.traceId || 'unknown');
  } catch (err) {
    next(err);
  }
}
