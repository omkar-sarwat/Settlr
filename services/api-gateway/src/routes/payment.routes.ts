// Payment routes — protected, proxied to payment-service. Requires Idempotency-Key header on POST.
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { ErrorCodes } from '@settlr/types/errors';

export const paymentRouter = Router();

const initiatePaymentSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000_00),
  currency: z.literal('INR'),
  description: z.string().max(255).optional(),
});

async function proxy(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const url = `${config.paymentServiceUrl}${path}`;
    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? req.body : undefined,
      headers: {
        'x-trace-id': req.traceId,
        'x-user-id': req.userId || '',
        'x-idempotency-key': req.headers['idempotency-key'] as string || '',
        'content-type': 'application/json',
      },
      timeout: 30000,
    });
    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }
    logger.error('proxy_error', { traceId: req.traceId, path, error: (error as Error).message });
    res.status(502).json({ success: false, error: 'SERVICE_UNAVAILABLE', traceId: req.traceId });
  }
}

paymentRouter.use(authMiddleware);

// POST requires Idempotency-Key header to prevent double charges
paymentRouter.post('/', validate(initiatePaymentSchema), (req: Request, res: Response) => {
  if (!req.headers['idempotency-key']) {
    res.status(400).json({
      success: false,
      error: ErrorCodes.VALIDATION_ERROR,
      message: 'Idempotency-Key header is required',
      traceId: req.traceId,
    });
    return;
  }
  proxy(req, res, 'POST', '/payments');
});

// GET /payments — List transactions with pagination & filters (proxied to payment-service)
paymentRouter.get('/', (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  proxy(req, res, 'GET', `/payments${qs ? `?${qs}` : ''}`);
});

// GET /payments/dashboard-stats — Per-account today stats (user dashboard)
paymentRouter.get('/dashboard-stats', (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  proxy(req, res, 'GET', `/payments/dashboard-stats${qs ? `?${qs}` : ''}`);
});

paymentRouter.get('/:transactionId', (req, res) => proxy(req, res, 'GET', `/payments/${req.params.transactionId}`));
