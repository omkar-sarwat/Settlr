// Transaction routes — protected proxy for transaction detail aggregation endpoint.
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { authMiddleware } from '../middleware/auth.middleware';

export const transactionRouter = Router();

async function proxy(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const response = await axios({
      method,
      url: `${config.paymentServiceUrl}${path}`,
      headers: {
        'x-trace-id': req.traceId,
        'x-user-id': req.userId || '',
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

    logger.error('proxy_error', {
      traceId: req.traceId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(502).json({ success: false, error: 'SERVICE_UNAVAILABLE', traceId: req.traceId });
  }
}

transactionRouter.use(authMiddleware);

transactionRouter.get('/:transactionId/details', (req: Request, res: Response) =>
  proxy(req, res, 'GET', `/payments/transactions/${req.params.transactionId}/details`)
);
