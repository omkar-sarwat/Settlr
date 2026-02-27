// Admin routes — system metrics, flagged transactions, live feed, fraud stats.
// Fetches data from payment-service and fraud-service via internal HTTP calls.
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';

export const adminRouter = Router();

// Internal proxy helper — calls the target backend service and returns its response
async function proxyTo(
  serviceUrl: string,
  req: Request,
  res: Response,
  method: string,
  path: string,
): Promise<void> {
  try {
    const url = `${serviceUrl}${path}`;
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const fullUrl = qs ? `${url}?${qs}` : url;

    const response = await axios({
      method,
      url: fullUrl,
      data: method !== 'GET' ? req.body : undefined,
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

    logger.error('admin_proxy_error', {
      traceId: req.traceId,
      path,
      error: (error as Error).message,
    });

    res.status(502).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      traceId: req.traceId,
    });
  }
}

// GET /admin/metrics — real aggregated system metrics (from payment-service)
adminRouter.get('/metrics', (req: Request, res: Response) => {
  proxyTo(config.paymentServiceUrl, req, res, 'GET', '/payments/metrics');
});

// GET /admin/flagged — flagged transactions from fraud-service
adminRouter.get('/flagged', (req: Request, res: Response) => {
  proxyTo(config.fraudServiceUrl, req, res, 'GET', '/fraud/flagged');
});

// POST /admin/flagged/:id/approve — approve a flagged transaction
adminRouter.post('/flagged/:id/approve', (req: Request, res: Response) => {
  proxyTo(config.fraudServiceUrl, req, res, 'POST', `/fraud/flagged/${req.params.id}/approve`);
});

// POST /admin/flagged/:id/block — block a flagged transaction
adminRouter.post('/flagged/:id/block', (req: Request, res: Response) => {
  proxyTo(config.fraudServiceUrl, req, res, 'POST', `/fraud/flagged/${req.params.id}/block`);
});

// GET /admin/live — live transaction feed
adminRouter.get('/live', (req: Request, res: Response) => {
  proxyTo(config.paymentServiceUrl, req, res, 'GET', '/payments');
});

// GET /admin/fraud/stats — fraud statistics
adminRouter.get('/fraud/stats', (req: Request, res: Response) => {
  proxyTo(config.fraudServiceUrl, req, res, 'GET', '/fraud/stats');
});
