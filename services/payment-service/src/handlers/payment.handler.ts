// Payment handler — HTTP layer only. Parses request, calls paymentService, returns IApiResponse.
import type { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import type { IApiResponse } from '@settlr/types';

function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

// POST /payments — Initiate a new transfer
export async function initiatePaymentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentService.initiatePayment({
      idempotencyKey: req.headers['x-idempotency-key'] as string,
      fromAccountId: req.body.fromAccountId,
      toAccountId: req.body.toAccountId,
      amount: req.body.amount,
      currency: req.body.currency || 'INR',
      description: req.body.description,
      userId: req.userId!,
      traceId: req.traceId!,
    });

    const statusCode = result.fromCache ? 200 : result.statusCode || 201;
    respond(res, statusCode, { success: true, data: result.data }, req.traceId!);
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
