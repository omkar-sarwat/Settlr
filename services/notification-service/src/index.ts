// Notification service entry point — subscribes to Kafka topics and sends email notifications.
// Topics: payment.completed, payment.failed, payment.fraud_blocked, webhook.delivery.failed

import express, { type Request, type Response, type NextFunction } from 'express';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { createConsumer, disconnectConsumer } from '@settlr/kafka/consumer';
import { KafkaTopics, AppError } from '@settlr/types';
import type { Consumer } from 'kafkajs';
import {
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentFraudBlocked,
  handleWebhookDeliveryFailed,
} from './emailService';

const app = express();
app.use(express.json());

let kafkaConsumer: Consumer | null = null;

// ── Health endpoints ──────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.get('/ready', (_req: Request, res: Response) => {
  const ready = kafkaConsumer !== null;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    kafka: ready,
  });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const traceId = req.headers['x-trace-id'] as string || 'unknown';

  if (error instanceof AppError && error.isOperational) {
    logger.warn('operational_error', { traceId, code: error.code, message: error.message });
    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
      traceId,
    });
  }

  logger.error('unexpected_error', { traceId, error: error.message, stack: error.stack });
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    traceId,
  });
});

// ── Start server + Kafka consumer ─────────────────────────────────────────
async function start(): Promise<void> {
  const port = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3005', 10);

  // Subscribe to all 4 notification topics
  try {
    kafkaConsumer = await createConsumer('notification-service-group', {
      [KafkaTopics.PAYMENT_COMPLETED]: handlePaymentCompleted,
      [KafkaTopics.PAYMENT_FAILED]: handlePaymentFailed,
      [KafkaTopics.PAYMENT_FRAUD_BLOCKED]: handlePaymentFraudBlocked,
      [KafkaTopics.WEBHOOK_DELIVERY_FAILED]: handleWebhookDeliveryFailed,
    });
    logger.info('kafka_consumer_started', { service: 'notification-service' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    logger.error('kafka_consumer_start_failed', { error: msg });
    // Continue running — emails won't be sent but health endpoint stays up
  }

  app.listen(port, () => {
    logger.info('notification_service_started', { port });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('shutdown_signal_received', { signal });
    if (kafkaConsumer) {
      await disconnectConsumer(kafkaConsumer);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error: unknown) => {
  logger.error('notification_service_fatal', { error: String(error) });
  process.exit(1);
});
