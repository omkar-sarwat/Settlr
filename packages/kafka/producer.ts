// Kafka event publisher — wraps every event in a standard envelope { eventId, eventType, timestamp, version, traceId, data }.
// Import { publishEvent } from '@settlr/kafka' in any service that needs to publish events.
//
// CRITICAL RULES:
//   1. Only call publishEvent AFTER the database transaction has committed successfully.
//      Publishing before commit risks sending events for data that gets rolled back.
//   2. Use traceId as the message key so all events from one request go to the same partition.
//   3. The event envelope is immutable once published — consumers should treat it as read-only.
//
// Import path: import { publishEvent, connectProducer, disconnectProducer } from '@settlr/kafka';

import { Kafka, type Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import type { IKafkaEvent } from '@settlr/types';
import { KafkaTopics } from '@settlr/types';

/** Re-export topic constants so services can import from '@settlr/kafka' directly */
export { KafkaTopics };

/** Union of all valid Kafka topic strings — use this for type safety */
export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];

/**
 * Creates the KafkaJS client configured for Upstash Kafka.
 * Uses SCRAM-SHA-256 authentication over TLS as required by Upstash.
 * The client is a singleton — it's created once at module load and reused.
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

/** The shared producer instance — reused across all publishEvent calls */
const producer: Producer = kafka.producer();

/** Tracks whether we've already connected to avoid duplicate connect() calls */
let connected = false;

/**
 * Explicitly connects the Kafka producer.
 * Call this during service startup to fail fast if Kafka is unreachable.
 * Returns true if connected, false on failure.
 *
 * Note: publishEvent() also lazy-connects if you forget to call this,
 * but explicit startup connection provides faster error feedback.
 *
 * Usage (in service index.ts):
 *   const kafkaOk = await connectProducer();
 *   if (!kafkaOk) process.exit(1);
 */
export async function connectProducer(): Promise<boolean> {
  try {
    if (!connected) {
      await producer.connect();
      connected = true;
      logger.info('kafka_producer_connected');
    }
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Kafka error';
    logger.error('kafka_producer_connection_failed', { error: message });
    return false;
  }
}

/**
 * Publishes a typed event to a Kafka topic wrapped in the standard envelope.
 * Automatically connects on first call if connectProducer() wasn't called.
 *
 * The topic parameter uses the KafkaTopic union type for compile-time safety.
 * You can also pass a plain string if the topic isn't in KafkaTopics (future topics).
 *
 * @param topic   - The Kafka topic name (e.g. KafkaTopics.PAYMENT_COMPLETED)
 * @param data    - The event payload (type-safe via generic T)
 * @param traceId - Request trace ID for correlating all events from one user action
 *
 * Example:
 *   await publishEvent(KafkaTopics.PAYMENT_COMPLETED, { transactionId, amount }, req.traceId);
 */
export async function publishEvent<T>(
  topic: KafkaTopic | string,
  data: T,
  traceId: string
): Promise<void> {
  // Lazy connect — first call establishes the connection, subsequent calls skip this
  if (!connected) {
    await producer.connect();
    connected = true;
    logger.info('kafka_producer_connected');
  }

  // Wrap the payload in the standard Settlr event envelope
  const event: IKafkaEvent<T> = {
    eventId: randomUUID(),       // Unique per event — consumers use this for deduplication
    eventType: topic,            // Same as the Kafka topic name
    timestamp: new Date().toISOString(),
    version: '1.0',              // Schema version for future migrations
    traceId,                     // Correlates all events from one user request
    data,
  };

  try {
    // Use traceId as the message key so all events from one request go to the same partition.
    // This guarantees ordering for events belonging to the same user action.
    await producer.send({
      topic,
      messages: [{ key: traceId, value: JSON.stringify(event) }],
    });

    logger.info('kafka_event_published', {
      topic,
      eventId: event.eventId,
      traceId,
    });
  } catch (error: unknown) {
    // Log the error but re-throw — the caller (service layer) decides how to handle it.
    // In the payment flow, a Kafka publish failure after DB commit means the event is lost
    // and should be recovered via a compensating mechanism (e.g. outbox table polling).
    const errorMessage = error instanceof Error ? error.message : 'Unknown Kafka error';
    logger.error('kafka_publish_failed', {
      topic,
      eventId: event.eventId,
      traceId,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Gracefully disconnects the Kafka producer.
 * Call this in the shutdown handler (SIGTERM) to flush pending messages.
 */
export async function disconnectProducer(): Promise<void> {
  if (connected) {
    await producer.disconnect();
    connected = false;
    logger.info('kafka_producer_disconnected');
  }
}
