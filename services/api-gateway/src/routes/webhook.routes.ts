// Webhook routes — protected, proxied to webhook-service
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

export const webhookRouter = Router();

const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

async function proxy(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const url = `${config.webhookServiceUrl}${path}`;
    const response = await axios({
      method,
      url,
      data: ['POST', 'DELETE'].includes(method) ? req.body : undefined,
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

webhookRouter.use(authMiddleware);

webhookRouter.post('/', validate(registerWebhookSchema), (req, res) => proxy(req, res, 'POST', '/webhooks'));
webhookRouter.get('/', (req, res) => proxy(req, res, 'GET', '/webhooks'));
webhookRouter.delete('/:endpointId', (req, res) => proxy(req, res, 'DELETE', `/webhooks/${req.params.endpointId}`));
webhookRouter.get('/:endpointId/deliveries', (req, res) => proxy(req, res, 'GET', `/webhooks/${req.params.endpointId}/deliveries`));
