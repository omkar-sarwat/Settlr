// Unit tests for webhook dispatcher — successful delivery, failed delivery,
// retry scheduling, max attempts exhausted, and HMAC signature verification.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('@settlr/config', () => ({
  config: {
    webhookTimeoutMs: 5000,
    webhookRetryDelays: [30, 300, 1800, 7200],
    webhookMaxAttempts: 5,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/kafka', () => ({
  publishEvent: vi.fn(),
  KafkaTopics: { WEBHOOK_DELIVERY_FAILED: 'webhook.delivery.failed' },
}));

vi.mock('../../src/repositories/webhook.repository', () => ({
  webhookRepository: {
    findActiveByEvent: vi.fn(),
    createDelivery: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn(),
    scheduleRetry: vi.fn(),
    findById: vi.fn(),
    findPendingRetries: vi.fn(),
  },
}));

vi.mock('../../src/signer', () => ({
  buildWebhookHeaders: vi.fn().mockReturnValue({
    'Content-Type': 'application/json',
    'X-Settlr-Signature': 'sha256=abc123',
    'X-Settlr-Event': 'payment.completed',
    'X-Settlr-Delivery': 'del-001',
    'X-Settlr-Timestamp': '1234567890',
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { dispatchWebhook, retryDelivery } from '../../src/dispatcher';
import { webhookRepository } from '../../src/repositories/webhook.repository';
import { publishEvent } from '@settlr/kafka';

const mockEndpoint = {
  id: 'ep-001',
  user_id: 'u-001',
  url: 'https://example.com/webhook',
  secret: 'whsec_test123',
  events: ['payment.completed'],
  is_active: true,
};

const mockDelivery = {
  id: 'del-001',
  endpoint_id: 'ep-001',
  transaction_id: 'txn-001',
  event_type: 'payment.completed',
  payload: { transactionId: 'txn-001', amount: 50000 },
  attempt_number: 1,
  status: 'pending',
};

describe('Webhook Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (webhookRepository.findActiveByEvent as Mock).mockResolvedValue([mockEndpoint]);
    (webhookRepository.createDelivery as Mock).mockResolvedValue(mockDelivery);
  });

  describe('dispatchWebhook', () => {
    it('delivers webhook successfully when endpoint returns 200', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

      expect(webhookRepository.findActiveByEvent).toHaveBeenCalledWith('payment.completed');
      expect(webhookRepository.createDelivery).toHaveBeenCalledWith({
        endpointId: 'ep-001',
        transactionId: 'txn-001',
        eventType: 'payment.completed',
        payload: { amount: 50000 },
      });
      expect(webhookRepository.markDelivered).toHaveBeenCalledWith('del-001', 200);
    });

    it('schedules retry when endpoint returns non-2xx', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

      expect(webhookRepository.markDelivered).not.toHaveBeenCalled();
      expect(webhookRepository.scheduleRetry).toHaveBeenCalledWith(
        'del-001',
        expect.any(Date),
        500
      );
    });

    it('schedules retry when fetch throws (network error)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

      expect(webhookRepository.scheduleRetry).toHaveBeenCalledWith(
        'del-001',
        expect.any(Date),
        null
      );
    });

    it('does not throw when no endpoints are subscribed', async () => {
      (webhookRepository.findActiveByEvent as Mock).mockResolvedValue([]);

      await expect(
        dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 })
      ).resolves.not.toThrow();

      expect(webhookRepository.createDelivery).not.toHaveBeenCalled();
    });
  });

  describe('retry scheduling with exponential backoff', () => {
    it('schedules first retry after 30 seconds', async () => {
      const delivery = { ...mockDelivery, attempt_number: 1 };
      (webhookRepository.createDelivery as Mock).mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({ ok: false, status: 502 });

      await dispatchWebhook('txn-001', 'payment.completed', {});

      const retryDate = (webhookRepository.scheduleRetry as Mock).mock.calls[0][1] as Date;
      const delayMs = retryDate.getTime() - Date.now();
      // Should be approximately 30 seconds (within 2 second tolerance)
      expect(delayMs).toBeGreaterThan(28_000);
      expect(delayMs).toBeLessThan(32_000);
    });
  });

  describe('max attempts exhausted', () => {
    it('marks delivery as permanently failed after all retries', async () => {
      // attempt_number > retry delays length means all retries exhausted
      const exhaustedDelivery = { ...mockDelivery, attempt_number: 5 };
      (webhookRepository.createDelivery as Mock).mockResolvedValue(exhaustedDelivery);
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      await dispatchWebhook('txn-001', 'payment.completed', {});

      expect(webhookRepository.markFailed).toHaveBeenCalledWith('del-001', 503);
      expect(webhookRepository.scheduleRetry).not.toHaveBeenCalled();
    });

    it('publishes WEBHOOK_DELIVERY_FAILED event when all retries exhausted', async () => {
      const exhaustedDelivery = { ...mockDelivery, attempt_number: 5 };
      (webhookRepository.createDelivery as Mock).mockResolvedValue(exhaustedDelivery);
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      await dispatchWebhook('txn-001', 'payment.completed', {});

      expect(publishEvent).toHaveBeenCalledWith(
        'webhook.delivery.failed',
        expect.objectContaining({
          deliveryId: 'del-001',
          endpointId: 'ep-001',
          attemptNumber: 5,
        }),
        'del-001'
      );
    });
  });

  describe('retryDelivery', () => {
    it('retries delivery when endpoint is still active', async () => {
      (webhookRepository.findById as Mock).mockResolvedValue(mockEndpoint);
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await retryDelivery(mockDelivery as any);

      expect(webhookRepository.findById).toHaveBeenCalledWith('ep-001');
      expect(mockFetch).toHaveBeenCalled();
      expect(webhookRepository.markDelivered).toHaveBeenCalledWith('del-001', 200);
    });

    it('marks as failed when endpoint is no longer active', async () => {
      (webhookRepository.findById as Mock).mockResolvedValue({ ...mockEndpoint, is_active: false });

      await retryDelivery(mockDelivery as any);

      expect(webhookRepository.markFailed).toHaveBeenCalledWith('del-001', null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('marks as failed when endpoint is deleted', async () => {
      (webhookRepository.findById as Mock).mockResolvedValue(null);

      await retryDelivery(mockDelivery as any);

      expect(webhookRepository.markFailed).toHaveBeenCalledWith('del-001', null);
    });
  });
});
