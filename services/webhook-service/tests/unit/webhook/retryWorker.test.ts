// ═══════════════════════════════════════════════════════════════
// RETRY WORKER / EXPONENTIAL BACKOFF TESTS
// Tests retry delay scheduling: 30s, 300s, 1800s, 7200s
// Tests permanent failure after all retries exhausted.
// Tests are done through dispatcher since scheduleRetry is private.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────
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

vi.mock('../../../src/repositories/webhook.repository', () => ({
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

vi.mock('../../../src/signer', () => ({
  buildWebhookHeaders: vi.fn().mockReturnValue({
    'Content-Type': 'application/json',
    'X-Settlr-Signature': 'sha256=mock',
    'X-Settlr-Event': 'payment.completed',
    'X-Settlr-Delivery': 'del-001',
    'X-Settlr-Timestamp': '1234567890',
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { dispatchWebhook } from '../../../src/dispatcher';
import { webhookRepository } from '../../../src/repositories/webhook.repository';

const mockEndpoint = {
  id: 'ep-001',
  user_id: 'u-001',
  url: 'https://example.com/webhook',
  secret: 'whsec_test123',
  events: ['payment.completed'],
  is_active: true,
};

function makeDelivery(attemptNumber: number) {
  return {
    id: 'del-001',
    endpoint_id: 'ep-001',
    transaction_id: 'txn-001',
    event_type: 'payment.completed',
    payload: { transactionId: 'txn-001', amount: 50000 },
    attempt_number: attemptNumber,
    status: 'pending',
  };
}

/** Helper: set up a failing delivery with specific attempt number */
function setupFailingDelivery(attemptNumber: number) {
  (webhookRepository.findActiveByEvent as Mock).mockResolvedValue([mockEndpoint]);
  (webhookRepository.createDelivery as Mock).mockResolvedValue(makeDelivery(attemptNumber));
  mockFetch.mockResolvedValue({ ok: false, status: 502 });
}

/** Helper: extract the retry Date from the scheduleRetry mock call */
function getScheduledRetryTime(): number {
  const calls = (webhookRepository.scheduleRetry as Mock).mock.calls;
  if (calls.length === 0) throw new Error('scheduleRetry was not called');
  return (calls[0][1] as Date).getTime();
}

// ═════════════════════════════════════════════════════════════
describe('RetryWorker — Exponential Backoff Scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-01: schedules retry 1 at exactly 30 seconds after first failure`, async () => {
    setupFailingDelivery(1);

    const now = Date.now();
    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    const nextRetry = getScheduledRetryTime();
    const expected = now + 30_000;
    expect(Math.abs(nextRetry - expected)).toBeLessThan(1000);
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-02: schedules retry 2 at exactly 300 seconds (5 minutes) after second failure`, async () => {
    setupFailingDelivery(2);

    const now = Date.now();
    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    const nextRetry = getScheduledRetryTime();
    const expected = now + 300_000;
    expect(Math.abs(nextRetry - expected)).toBeLessThan(1000);
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-03: schedules retry 3 at exactly 1800 seconds (30 minutes) after third failure`, async () => {
    setupFailingDelivery(3);

    const now = Date.now();
    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    const nextRetry = getScheduledRetryTime();
    expect(Math.abs(nextRetry - (now + 1_800_000))).toBeLessThan(1000);
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-04: schedules retry 4 at exactly 7200 seconds (2 hours) after fourth failure`, async () => {
    setupFailingDelivery(4);

    const now = Date.now();
    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    const nextRetry = getScheduledRetryTime();
    expect(Math.abs(nextRetry - (now + 7_200_000))).toBeLessThan(1000);
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-05: permanently marks as FAILED after 4 retries are exhausted — no more retries`, async () => {
    setupFailingDelivery(5); // attempt 5 = all 4 retries exhausted

    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    expect(webhookRepository.markFailed).toHaveBeenCalledWith('del-001', 502);
    expect(webhookRepository.scheduleRetry).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-06: retry delay sequence is [30, 300, 1800, 7200] seconds — exponential backoff`, async () => {
    const expectedDelays = [30, 300, 1800, 7200];

    for (let attempt = 1; attempt <= 4; attempt++) {
      vi.clearAllMocks();
      setupFailingDelivery(attempt);

      const now = Date.now();
      await dispatchWebhook('txn-001', 'payment.completed', {});

      const nextRetry = getScheduledRetryTime();
      const actualDelaySec = Math.round((nextRetry - now) / 1000);
      expect(actualDelaySec).toBe(expectedDelays[attempt - 1]);
    }
  });

  // ────────────────────────────────────────────────────────────
  it(`RETRY-07: publishes WEBHOOK_DELIVERY_FAILED Kafka event when permanently failed`, async () => {
    const { publishEvent } = await import('@settlr/kafka');
    setupFailingDelivery(5);

    await dispatchWebhook('txn-001', 'payment.completed', { amount: 50000 });

    expect(publishEvent).toHaveBeenCalledWith(
      'webhook.delivery.failed',
      expect.objectContaining({
        deliveryId: 'del-001',
        endpointId: 'ep-001',
        attemptNumber: 5,
        responseCode: 502,
      }),
      'del-001'
    );
  });
});
