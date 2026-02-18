// Retry worker — polls DB for failed deliveries and retries with exponential backoff. Runs on an interval.
import { logger } from '@settlr/logger';
import { webhookRepository } from './repositories/webhook.repository';
import { retryDelivery } from './dispatcher';

const POLL_INTERVAL_MS = 10_000; // Check for pending retries every 10 seconds
let intervalId: NodeJS.Timeout | null = null;

// Process all deliveries that are due for retry
async function processRetries(): Promise<void> {
  try {
    const pendingRetries = await webhookRepository.findPendingRetries();

    if (pendingRetries.length === 0) return;

    logger.info('retry_worker_processing', { count: pendingRetries.length });

    for (const delivery of pendingRetries) {
      try {
        await retryDelivery(delivery);
      } catch (err: unknown) {
        logger.error('retry_worker_delivery_error', {
          deliveryId: delivery.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  } catch (err: unknown) {
    logger.error('retry_worker_poll_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Start the retry worker polling loop
export function startRetryWorker(): void {
  logger.info('retry_worker_started', { pollIntervalMs: POLL_INTERVAL_MS });
  intervalId = setInterval(processRetries, POLL_INTERVAL_MS);
  // Run immediately on start
  processRetries();
}

// Stop the retry worker
export function stopRetryWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('retry_worker_stopped');
  }
}
