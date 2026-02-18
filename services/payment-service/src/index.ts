// Payment service — Express bootstrap, DB + Redis + Kafka startup, routes, error handler, port 3002
import express, { Request, Response, NextFunction } from 'express';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { db, runMigrations } from '@settlr/database';
import { connectRedis } from '@settlr/redis';
import { connectProducer } from '@settlr/kafka';
import { AppError } from '@settlr/types/errors';

import { paymentRouter } from './routes/payment.routes';

const app = express();

app.use(express.json());

// Extract trace-id from gateway on every request
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.traceId = (req.headers['x-trace-id'] as string) || req.traceId;
  next();
});

// ── System routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'payment-service' });
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
app.use('/payments', paymentRouter);

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
  await runMigrations();

  const redisOk = await connectRedis();
  if (!redisOk) {
    logger.error('startup_failed', { reason: 'Redis connection failed — payment-service requires Redis for idempotency + locks' });
    process.exit(1);
  }

  const kafkaOk = await connectProducer();
  if (!kafkaOk) {
    logger.warn('kafka_unavailable', { message: 'Payment service starting without Kafka — events will fail' });
  }

  const port = parseInt(process.env.PAYMENT_SERVICE_PORT || '3002', 10);
  app.listen(port, () => {
    logger.info('server_started', { service: 'payment-service', port });
  });
}

start();

export { app };
