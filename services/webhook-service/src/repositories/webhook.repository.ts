// Webhook repository — SQL queries for webhook_endpoints and webhook_deliveries tables.
import { db } from '@settlr/database';
import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';
import type { IWebhookEndpointRow, IWebhookDeliveryRow } from '@settlr/types';

export const webhookRepository = {
  // Create a new webhook endpoint with auto-generated secret
  async createEndpoint(userId: string, url: string, events: string[]): Promise<IWebhookEndpointRow> {
    const secret = `whsec_${randomBytes(32).toString('hex')}`;
    const [row] = await db('webhook_endpoints')
      .insert({ user_id: userId, url, secret, events, is_active: true })
      .returning('*');
    return row;
  },

  // List all endpoints for a user
  async findByUserId(userId: string): Promise<IWebhookEndpointRow[]> {
    return db('webhook_endpoints').where({ user_id: userId, is_active: true }).orderBy('created_at', 'desc');
  },

  // Find a single endpoint by id
  async findById(endpointId: string): Promise<IWebhookEndpointRow | undefined> {
    return db('webhook_endpoints').where({ id: endpointId }).first();
  },

  // Soft-delete (deactivate) an endpoint
  async deactivate(endpointId: string, userId: string): Promise<boolean> {
    const updated = await db('webhook_endpoints')
      .where({ id: endpointId, user_id: userId })
      .update({ is_active: false });
    return updated > 0;
  },

  // Find all active endpoints that subscribe to a given event type
  async findActiveByEvent(eventType: string): Promise<IWebhookEndpointRow[]> {
    return db('webhook_endpoints')
      .where({ is_active: true })
      .whereRaw('? = ANY(events)', [eventType]);
  },

  // Create a new delivery record
  async createDelivery(data: {
    endpointId: string;
    transactionId: string | null;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<IWebhookDeliveryRow> {
    const [row] = await db('webhook_deliveries')
      .insert({
        endpoint_id: data.endpointId,
        transaction_id: data.transactionId,
        event_type: data.eventType,
        payload: JSON.stringify(data.payload),
        status: 'pending',
        attempt_number: 1,
      })
      .returning('*');
    return row;
  },

  // Mark a delivery as successfully delivered
  async markDelivered(deliveryId: string, responseCode: number): Promise<void> {
    await db('webhook_deliveries')
      .where({ id: deliveryId })
      .update({
        status: 'delivered',
        response_code: responseCode,
        delivered_at: new Date(),
      });
  },

  // Schedule a retry for a failed delivery
  async scheduleRetry(deliveryId: string, nextRetryAt: Date, responseCode: number | null): Promise<void> {
    await db('webhook_deliveries')
      .where({ id: deliveryId })
      .update({
        status: 'retrying',
        response_code: responseCode,
        attempt_number: db.raw('attempt_number + 1'),
        next_retry_at: nextRetryAt,
      });
  },

  // Mark a delivery as permanently failed
  async markFailed(deliveryId: string, responseCode: number | null): Promise<void> {
    await db('webhook_deliveries')
      .where({ id: deliveryId })
      .update({
        status: 'failed',
        response_code: responseCode,
      });
  },

  // Find all deliveries that are due for retry
  async findPendingRetries(): Promise<IWebhookDeliveryRow[]> {
    return db('webhook_deliveries')
      .where({ status: 'retrying' })
      .where('next_retry_at', '<=', new Date())
      .orderBy('next_retry_at', 'asc')
      .limit(50);
  },

  // Get delivery history for an endpoint (paginated)
  async getDeliveries(endpointId: string, page: number, limit: number): Promise<{ items: IWebhookDeliveryRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const [items, [{ count }]] = await Promise.all([
      db('webhook_deliveries').where({ endpoint_id: endpointId }).orderBy('created_at', 'desc').offset(offset).limit(limit),
      db('webhook_deliveries').where({ endpoint_id: endpointId }).count('id as count'),
    ]);
    return { items, total: Number(count) };
  },
};
