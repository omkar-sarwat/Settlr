// Fraud service — Express bootstrap, Redis + DB + Kafka startup, routes, port 3004
import express, { Request, Response, NextFunction } from 'express';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { db } from '@settlr/database';
import { connectRedis } from '@settlr/redis';
import { AppError } from '@settlr/types/errors';

import { fraudRouter } from './routes/fraud.routes';

const app = express();

app.use(express.json());

// Extract trace-id from calling service
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.traceId = (req.headers['x-trace-id'] as string) || req.traceId;
  next();
});

// ── System routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'fraud-service' });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API routes
app.use('/fraud', fraudRouter);

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
  const redisOk = await connectRedis();
  if (!redisOk) {
    logger.error('startup_failed', { reason: 'Redis connection failed — fraud-service requires Redis for rule counters' });
    process.exit(1);
  }

  const port = parseInt(process.env.FRAUD_SERVICE_PORT || '3004', 10);
  app.listen(port, () => {
    logger.info('server_started', { service: 'fraud-service', port });
  });
}

start();

export { app };
