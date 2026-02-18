// Webhook service — Express bootstrap, Kafka consumer for payment events, retry worker, port 3004
import express, { Request, Response, NextFunction } from 'express';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { db } from '@settlr/database';
import { connectRedis } from '@settlr/redis';
import { connectProducer, KafkaTopics } from '@settlr/kafka';
import { createConsumer } from '@settlr/kafka/consumer';
import { AppError } from '@settlr/types/errors';
import type { IKafkaEvent } from '@settlr/types';

import { webhookRouter } from './routes/webhook.routes';
import { dispatchWebhook } from './dispatcher';
import { startRetryWorker } from './retryWorker';

const app = express();

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.traceId = (req.headers['x-trace-id'] as string) || req.traceId;
  next();
});

// ── System routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'webhook-service' });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API routes (proxied from api-gateway)
app.use('/webhooks', webhookRouter);

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

// ── Start server + Kafka consumer + retry worker
async function start(): Promise<void> {
  // Connect to Redis (needed for Kafka producer in dispatcher failure events)
  await connectRedis();
  await connectProducer();

  // Subscribe to Kafka topics — dispatch webhooks when payment events arrive
  await createConsumer('webhook-service-group', {
    [KafkaTopics.PAYMENT_COMPLETED]: async (event: IKafkaEvent) => {
      const data = event.data as Record<string, unknown>;
      await dispatchWebhook(
        data.transactionId as string,
        KafkaTopics.PAYMENT_COMPLETED,
        data
      );
    },
    [KafkaTopics.PAYMENT_FAILED]: async (event: IKafkaEvent) => {
      const data = event.data as Record<string, unknown>;
      await dispatchWebhook(
        data.transactionId as string || null,
        KafkaTopics.PAYMENT_FAILED,
        data
      );
    },
  });

  // Start the retry worker that polls for failed deliveries
  startRetryWorker();

  const port = parseInt(process.env.WEBHOOK_SERVICE_PORT || '3004', 10);
  app.listen(port, () => {
    logger.info('server_started', { service: 'webhook-service', port });
  });
}

start();

export { app };
