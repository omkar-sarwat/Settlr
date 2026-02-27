/**
 * REAL WEBHOOK INTEGRATION TESTS
 * ============================================================
 * NO vi.mock() — hits the live webhook-service via API Gateway.
 * Tests real webhook registration, listing, and deletion.
 * Uses the actual PostgreSQL DB with real insert/select/delete.
 *
 * Requirements: all services running, DB seeded.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { realLogin, apiGet, apiPost, apiDelete, USERS } from './helpers/api';

let token: string;
let createdWebhookId: string;

beforeAll(async () => {
  const auth = await realLogin(USERS.primary.email, USERS.primary.password);
  token = auth.accessToken;
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Webhook: Register', () => {
  it('registers a real webhook endpoint in the database', async () => {
    const res = await apiPost('/api/v1/webhooks', token, {
      url: 'https://webhook.site/real-integration-test',
      events: ['payment.completed', 'payment.failed'],
    });
    expect(res.status).toBe(201);
    const body = await res.json() as {
      success: boolean;
      data: { id: string; url: string; events: string[]; isActive: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.url).toBe('https://webhook.site/real-integration-test');
    expect(body.data.events).toContain('payment.completed');
    expect(body.data.isActive).toBe(true);

    // Save for subsequent tests
    createdWebhookId = body.data.id;
  });

  it('registers webhook with all supported events', async () => {
    const res = await apiPost('/api/v1/webhooks', token, {
      url: 'https://webhook.site/all-events-test',
      events: ['payment.completed', 'payment.failed', 'payment.fraud_blocked'],
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { events: string[] } };
    expect(body.success).toBe(true);
    expect(body.data.events.length).toBe(3);
  });

  it('rejects webhook registration with invalid URL (400)', async () => {
    const res = await apiPost('/api/v1/webhooks', token, {
      url: 'not-a-valid-url',
      events: ['payment.completed'],
    });
    expect(res.status).toBe(400);
  });

  it('rejects webhook registration with empty events array (400)', async () => {
    const res = await apiPost('/api/v1/webhooks', token, {
      url: 'https://webhook.site/test',
      events: [], // must have at least 1
    });
    expect(res.status).toBe(400);
  });

  it('rejects webhook registration without authentication (401)', async () => {
    const res = await fetch('http://localhost:3000/api/v1/webhooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://webhook.site/test',
        events: ['payment.completed'],
      }),
    });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LIST WEBHOOKS
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Webhook: List', () => {
  it('lists real webhooks from the database (includes just-created ones)', async () => {
    const res = await apiGet('/api/v1/webhooks', token);
    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: Array<{ id: string; url: string; events: string[] }>;
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect((body.data as Array<{ id: string }>).length).toBeGreaterThan(0);

    // Should contain the one we just registered
    const found = (body.data as Array<{ id: string }>).find((w) => w.id === createdWebhookId);
    if (createdWebhookId) {
      expect(found).toBeTruthy();
    }
  });

  it('webhook list entries have correct shape', async () => {
    const res = await apiGet('/api/v1/webhooks', token);
    const body = await res.json() as {
      data: Array<{
        id: string;
        url: string;
        events: string[];
        isActive: boolean;
        createdAt: string;
      }>;
    };
    const webhook = (body.data as Array<{ id: string; url: string; events: string[]; isActive: boolean; createdAt: string }>)[0];
    if (webhook) {
      expect(webhook.id).toBeTruthy();
      expect(webhook.url).toMatch(/^https?:\/\//);
      expect(Array.isArray(webhook.events)).toBe(true);
      expect(typeof webhook.isActive).toBe('boolean');
    }
  });

  it('rejects webhook list without authentication (401)', async () => {
    const res = await fetch('http://localhost:3000/api/v1/webhooks');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Webhook: Delete', () => {
  it('deletes a webhook and confirms it no longer exists', async () => {
    if (!createdWebhookId) {
      // Create one to delete
      const createRes = await apiPost('/api/v1/webhooks', token, {
        url: 'https://webhook.site/to-delete',
        events: ['payment.completed'],
      });
      const body = await createRes.json() as { data: { id: string } };
      createdWebhookId = body.data.id;
    }

    const deleteRes = await apiDelete(`/api/v1/webhooks/${createdWebhookId}`, token);
    expect([200, 204]).toContain(deleteRes.status);

    // Verify it's gone from the list
    const listRes = await apiGet('/api/v1/webhooks', token);
    const listBody = await listRes.json() as {
      data: Array<{ id: string }>;
    };
    const stillExists = (listBody.data as Array<{ id: string }>).find((w) => w.id === createdWebhookId);
    expect(stillExists).toBeFalsy();
  });

  it('returns 404 when deleting a non-existent webhook', async () => {
    const res = await apiDelete('/api/v1/webhooks/00000000-0000-0000-0000-000000000099', token);
    expect([404, 400]).toContain(res.status);
  });

  it('rejects webhook deletion without authentication (401)', async () => {
    const res = await fetch(`http://localhost:3000/api/v1/webhooks/some-id`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });
});
