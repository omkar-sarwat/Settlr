// Webhook dispatcher — sends POST to registered URLs with signed payload. Retries on failure.
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { publishEvent, KafkaTopics } from '@settlr/kafka';
import { webhookRepository } from './repositories/webhook.repository';
import { buildWebhookHeaders } from './signer';
import type { IWebhookDeliveryRow, IWebhookEndpointRow } from '@settlr/types';

const WEBHOOK_TIMEOUT_MS = config.webhookTimeoutMs;

// Retry delays in seconds: 30s, 5min, 30min, 2hr
const RETRY_DELAYS_SECONDS = config.webhookRetryDelays;
const MAX_ATTEMPTS = config.webhookMaxAttempts;

// Dispatch webhooks to all endpoints subscribed to this event type
export async function dispatchWebhook(
  transactionId: string | null,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await webhookRepository.findActiveByEvent(eventType);

  for (const endpoint of endpoints) {
    try {
      const delivery = await webhookRepository.createDelivery({
        endpointId: endpoint.id,
        transactionId,
        eventType,
        payload,
      });

      await attemptDelivery(delivery, endpoint);
    } catch (err: unknown) {
      logger.error('dispatch_webhook_error', {
        endpointId: endpoint.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

// Try to deliver the webhook, schedule retry on failure
async function attemptDelivery(delivery: IWebhookDeliveryRow, endpoint: IWebhookEndpointRow): Promise<void> {
  const payloadString = JSON.stringify(delivery.payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const headers = buildWebhookHeaders(
      endpoint.secret,
      payloadString,
      delivery.event_type,
      delivery.id
    );

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await webhookRepository.markDelivered(delivery.id, response.status);
      logger.info('webhook_delivered', {
        deliveryId: delivery.id,
        endpointId: endpoint.id,
        statusCode: response.status,
      });
    } else {
      await scheduleRetry(delivery, response.status);
    }
  } catch (error: unknown) {
    clearTimeout(timeout);
    logger.warn('webhook_delivery_failed', {
      deliveryId: delivery.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    await scheduleRetry(delivery, null);
  }
}

// Schedule a retry with exponential backoff, or mark as permanently failed
async function scheduleRetry(delivery: IWebhookDeliveryRow, responseCode: number | null): Promise<void> {
  const delayIndex = delivery.attempt_number - 1; // 0-indexed

  if (delayIndex >= RETRY_DELAYS_SECONDS.length) {
    // All retries exhausted — permanently mark as failed
    await webhookRepository.markFailed(delivery.id, responseCode);

    // Publish failure event for notification-service
    try {
      await publishEvent(KafkaTopics.WEBHOOK_DELIVERY_FAILED, {
        deliveryId: delivery.id,
        endpointId: delivery.endpoint_id,
        eventType: delivery.event_type,
        attemptNumber: delivery.attempt_number,
        responseCode,
      }, delivery.id);
    } catch {
      logger.error('kafka_webhook_failure_event_failed', { deliveryId: delivery.id });
    }

    logger.warn('webhook_permanently_failed', {
      deliveryId: delivery.id,
      attempts: delivery.attempt_number,
    });
    return;
  }

  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_SECONDS[delayIndex] * 1000);
  await webhookRepository.scheduleRetry(delivery.id, nextRetryAt, responseCode);

  logger.info('webhook_retry_scheduled', {
    deliveryId: delivery.id,
    attempt: delivery.attempt_number + 1,
    nextRetryAt: nextRetryAt.toISOString(),
  });
}

// Re-attempt delivery for retries found by the retry worker (same logic as initial attempt)
export async function retryDelivery(delivery: IWebhookDeliveryRow): Promise<void> {
  const endpoint = await webhookRepository.findById(delivery.endpoint_id);
  if (!endpoint || !endpoint.is_active) {
    await webhookRepository.markFailed(delivery.id, null);
    return;
  }
  await attemptDelivery(delivery, endpoint);
}
