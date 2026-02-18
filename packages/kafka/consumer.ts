// Kafka event subscriber — subscribes to topics and routes incoming events to the correct handler function.
// Each service creates its own consumer with a unique groupId so Kafka tracks offsets independently.
// Messages are automatically parsed from the standard KafkaEvent envelope.
//
// Services that consume events:
//   fraud-service         → listens to 'fraud.check.requested'
//   payment-service       → listens to 'fraud.check.result'
//   webhook-service       → listens to 'payment.completed', 'payment.failed'
//   notification-service  → listens to 'payment.completed', 'payment.failed', 'payment.fraud_blocked',
//                            'webhook.delivery.failed'
//
// Import path: import { createConsumer, disconnectConsumer } from '@settlr/kafka';

import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import type { IKafkaEvent } from '@settlr/types';

/**
 * Creates the KafkaJS client configured for Upstash Kafka.
 * Same configuration as the producer — SCRAM-SHA-256 over TLS.
 */
const kafka = new Kafka({
  clientId: 'settlr',
  brokers: [config.kafkaBroker],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',
    username: config.kafkaUsername,
    password: config.kafkaPassword,
  },
});

/**
 * The shape of a message handler function.
 * Each service provides one of these per topic it subscribes to.
 * The handler receives the parsed event envelope and processes the data.
 *
 * IMPORTANT: Handlers must be idempotent — Kafka guarantees at-least-once delivery,
 * meaning the same event may be delivered more than once (e.g. after a rebalance).
 * Always check if the work was already done before doing it again.
 */
export type MessageHandler<T = unknown> = (event: IKafkaEvent<T>) => Promise<void>;

/**
 * Tracks recently processed eventIds for duplicate detection.
 * This is an in-memory set that stores the last N event IDs.
 * It protects against duplicate delivery within a single process lifetime.
 * For cross-process deduplication, services should use the idempotency cache in Redis.
 */
const processedEventIds = new Set<string>();

/** Maximum number of event IDs to keep in the dedup set before pruning */
const MAX_DEDUP_SET_SIZE = 10_000;

/**
 * Removes old entries from the dedup set when it gets too large.
 * Uses a simple strategy: clear the entire set once it exceeds the max size.
 * This is acceptable because:
 *   - Kafka redeliveries typically happen within seconds, not hours
 *   - The Redis idempotency cache provides the durable dedup layer
 */
function pruneDeduplicationSet(): void {
  if (processedEventIds.size > MAX_DEDUP_SET_SIZE) {
    processedEventIds.clear();
    logger.debug('dedup_set_pruned', { maxSize: MAX_DEDUP_SET_SIZE });
  }
}

/**
 * Creates a Kafka consumer, subscribes to the given topics, and routes
 * each incoming message to the matching handler function.
 *
 * Features:
 *   - Automatic JSON parsing of the standard KafkaEvent envelope
 *   - In-memory event deduplication via eventId tracking
 *   - Error isolation: a failed handler logs the error and commits the offset
 *     (no infinite retry loops — dead letter queue handling can be added later)
 *   - Heartbeat logging for monitoring consumer health
 *
 * @param groupId  - Unique consumer group ID (e.g. 'fraud-service-group')
 * @param handlers - Map of topic name → handler function
 * @returns The Consumer instance (pass to disconnectConsumer on shutdown)
 *
 * Example:
 *   const consumer = await createConsumer('fraud-service-group', {
 *     [KafkaTopics.FRAUD_CHECK_REQUESTED]: async (event) => {
 *       const result = await runFraudEngine(event.data);
 *       await publishEvent(KafkaTopics.FRAUD_CHECK_RESULT, result, event.traceId);
 *     },
 *   });
 */
export async function createConsumer(
  groupId: string,
  handlers: Record<string, MessageHandler>
): Promise<Consumer> {
  const consumer: Consumer = kafka.consumer({ groupId });

  await consumer.connect();
  logger.info('kafka_consumer_connected', { groupId });

  // Subscribe to every topic that has a handler registered
  const topics = Object.keys(handlers);
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    logger.info('kafka_consumer_subscribed', { groupId, topic });
  }

  // Start processing messages — eachMessage runs one message at a time per partition
  // This guarantees ordering within a partition (important for payment events keyed by traceId)
  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload): Promise<void> => {
      const handler = handlers[topic];
      if (!handler) {
        logger.warn('kafka_no_handler', { topic, partition });
        return;
      }

      try {
        // Parse the raw Kafka message value into our standard envelope
        const raw = message.value?.toString();
        if (!raw) {
          logger.warn('kafka_empty_message', { topic, partition, offset: message.offset });
          return;
        }

        const event: IKafkaEvent = JSON.parse(raw);

        // ── DEDUPLICATION CHECK ──────────────────────────────────────────
        // Kafka guarantees at-least-once delivery, so we may see the same
        // event more than once. Skip events we've already processed.
        if (processedEventIds.has(event.eventId)) {
          logger.info('kafka_duplicate_event_skipped', {
            topic,
            eventId: event.eventId,
            traceId: event.traceId,
          });
          return;
        }

        logger.info('kafka_event_received', {
          topic,
          eventId: event.eventId,
          traceId: event.traceId,
          partition,
          offset: message.offset,
        });

        // Route to the registered handler for this topic
        await handler(event);

        // Mark as processed AFTER successful handling
        processedEventIds.add(event.eventId);
        pruneDeduplicationSet();

        logger.info('kafka_event_processed', {
          topic,
          eventId: event.eventId,
          traceId: event.traceId,
        });
      } catch (error: unknown) {
        // Log but don't rethrow — KafkaJS will retry if we throw, but we want
        // to commit the offset and move on to prevent poison pill messages from
        // blocking the consumer. The error is logged with full context for debugging.
        //
        // For production, consider publishing failed events to a dead letter topic
        // so they can be investigated and reprocessed manually.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('kafka_message_processing_failed', {
          topic,
          partition,
          error: errorMessage,
          stack: errorStack,
          offset: message.offset,
          groupId,
        });
      }
    },
  });

  logger.info('kafka_consumer_running', { groupId, topics });
  return consumer;
}

/**
 * Gracefully disconnects a Kafka consumer.
 * Call this in the shutdown handler (SIGTERM) to commit final offsets and leave the consumer group.
 * After disconnecting, Kafka reassigns this consumer's partitions to other group members.
 */
export async function disconnectConsumer(consumer: Consumer): Promise<void> {
  await consumer.disconnect();
  logger.info('kafka_consumer_disconnected');
}
