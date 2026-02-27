// Admin service — Express bootstrap, routes, port 3003.
// Aggregates data from payment-service and fraud-service for admin dashboards.
import express, { Request, Response, NextFunction } from 'express';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { AppError } from '@settlr/types/errors';

import { internalAuth } from './middleware/internalAuth.middleware';
import { adminRouter } from './routes/admin.routes';

const app = express();

app.use(express.json());

// Extract trace-id from gateway on every request
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.traceId = (req.headers['x-trace-id'] as string) || req.traceId;
  next();
});

// ── System routes (no auth)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── API routes (auth required — x-user-id forwarded by gateway)
app.use('/admin', internalAuth, adminRouter);

// ── Global error handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const traceId = req.traceId || 'unknown';

  if (error instanceof AppError && error.isOperational) {
    logger.warn('operational_error', { traceId, code: error.code, message: error.message });
    res.status(error.statusCode).json({
      success: false, error: error.code, message: error.message, traceId,
    });
    return;
  }

  logger.error('unexpected_error', { traceId, error: error.message, stack: error.stack });
  res.status(500).json({
    success: false, error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', traceId,
  });
});

// ── Start server
async function start(): Promise<void> {
  const port = parseInt(process.env.ADMIN_SERVICE_PORT || '3003', 10);
  app.listen(port, () => {
    logger.info('server_started', { service: 'admin-service', port });
  });
}

start();

export { app };
