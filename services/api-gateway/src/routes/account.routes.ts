// Account routes — all protected, proxied to account-service
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

export const accountRouter = Router();

const createAccountSchema = z.object({
  currency: z.literal('INR').default('INR'),
});

async function proxy(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const url = `${config.accountServiceUrl}${path}`;
    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? req.body : undefined,
      params: method === 'GET' ? req.query : undefined,
      headers: {
        'x-trace-id': req.traceId,
        'x-user-id': req.userId || '',
        'content-type': 'application/json',
      },
      timeout: 10000,
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

accountRouter.use(authMiddleware);

accountRouter.post('/', validate(createAccountSchema), (req, res) => proxy(req, res, 'POST', '/accounts'));
accountRouter.get('/', (req, res) => proxy(req, res, 'GET', '/accounts'));
accountRouter.get('/lookup', (req, res) => proxy(req, res, 'GET', '/accounts/lookup'));
accountRouter.get('/stats/weekly', (req, res) => proxy(req, res, 'GET', '/accounts/stats/weekly'));
accountRouter.get('/:accountId/stats', (req, res) => proxy(req, res, 'GET', `/accounts/${req.params.accountId}/stats`));
accountRouter.get('/:accountId/chart', (req, res) => proxy(req, res, 'GET', `/accounts/${req.params.accountId}/chart`));
accountRouter.get('/:accountId', (req, res) => proxy(req, res, 'GET', `/accounts/${req.params.accountId}`));
accountRouter.get('/:accountId/transactions', (req, res) => proxy(req, res, 'GET', `/accounts/${req.params.accountId}/transactions`));
accountRouter.get('/:accountId/ledger', (req, res) => proxy(req, res, 'GET', `/accounts/${req.params.accountId}/ledger`));
