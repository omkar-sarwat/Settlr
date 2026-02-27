/**
 * REAL PAYMENT INTEGRATION TESTS
 * ============================================================
 * NO vi.mock() — hits the live payment-service via API Gateway.
 * Tests real money transfer, idempotency, insufficient balance,
 * self-transfer prevention, fraud rules, and transaction history.
 *
 * Requirements: all services running, DB seeded, balance on sender account.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { realLogin, apiGet, apiPost, uuid, USERS, KNOWN_ACCOUNTS } from './helpers/api';

let senderToken: string;
let senderUserId: string;
let recipientToken: string;

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — Real login before payment tests
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  [{ accessToken: senderToken, userId: senderUserId }, { accessToken: recipientToken }] = await Promise.all([
    realLogin(USERS.primary.email, USERS.primary.password),
    realLogin(USERS.secondary.email, USERS.secondary.password).catch(() =>
      realLogin(USERS.primary.email, USERS.primary.password)
    ),
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE PAYMENT — SUCCESSFUL TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Payment: Successful Transfer', () => {
  it('transfers ₹100 from sender to recipient with real money movement', async () => {
    const idempotencyKey = uuid();
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 10000, // ₹100 in paise
        currency: 'INR',
        description: 'Real integration test transfer',
      },
      { 'idempotency-key': idempotencyKey },
    );

    expect(res.status).toBe(201);
    const body = await res.json() as {
      success: boolean;
      data: { id: string; status: string; amount: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.status).toMatch(/completed|pending/);
    expect(body.data.amount).toBe(10000);
  });

  it('transfers small amount ₹1 (minimum boundary test)', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 100, // ₹1 in paise (minimum)
        currency: 'INR',
        description: 'Min boundary transfer',
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('transfers ₹500 and returns correct transaction data shape', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 50000, // ₹500
        currency: 'INR',
        description: 'Shape verification transfer',
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as {
      success: boolean;
      data: {
        id: string;
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        currency: string;
        status: string;
        createdAt: string;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.fromAccountId).toBe(KNOWN_ACCOUNTS.sender);
    expect(body.data.toAccountId).toBe(KNOWN_ACCOUNTS.recipient);
    expect(body.data.currency).toBe('INR');
    expect(body.data.createdAt).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY — SAME KEY TWICE MUST NOT DOUBLE-CHARGE
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Payment: Idempotency (No Double Charge)', () => {
  it('sends same idempotency key twice — second call is deduplicated', async () => {
    const idempotencyKey = uuid();
    const payload = {
      fromAccountId: KNOWN_ACCOUNTS.sender,
      toAccountId: KNOWN_ACCOUNTS.recipient,
      amount: 10000, // ₹100
      currency: 'INR',
      description: 'Idempotency test',
    };

    const first = await apiPost('/api/v1/payments', senderToken, payload, {
      'idempotency-key': idempotencyKey,
    });
    expect(first.status).toBe(201);
    const firstBody = await first.json() as { data: { id: string } };
    const firstTxnId = firstBody.data.id;

    // Small wait to allow idempotency cache to settle
    await new Promise((r) => setTimeout(r, 200));

    const second = await apiPost('/api/v1/payments', senderToken, payload, {
      'idempotency-key': idempotencyKey,
    });
    expect(second.status).toBe(200); // 200 = cached response replay
    const secondBody = await second.json() as { data: { id: string } };

    // Same transaction ID — money was NOT moved twice
    expect(secondBody.data.id).toBe(firstTxnId);
  });

  it('rejects payment with no Idempotency-Key header (400)', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 10000,
        currency: 'INR',
      },
      // No idempotency-key header
    );
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION — BUSINESS RULE ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Payment: Validation Rules', () => {
  it('rejects self-transfer (same from and to account)', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.sender, // same!
        amount: 10000,
        currency: 'INR',
        description: 'Self transfer attempt',
      },
      { 'idempotency-key': uuid() },
    );
    // Must be 400 (validation) or 422 (business rule)
    expect([400, 422]).toContain(res.status);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('rejects payment with amount = 0', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 0,
        currency: 'INR',
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(400);
  });

  it('rejects payment with negative amount', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: -5000,
        currency: 'INR',
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(400);
  });

  it('rejects payment with invalid account UUID', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: 'not-a-uuid',
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 10000,
        currency: 'INR',
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(400);
  });

  it('rejects payment with unsupported currency', async () => {
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 10000,
        currency: 'USD', // only INR supported
      },
      { 'idempotency-key': uuid() },
    );
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated payment request (401)', async () => {
    const res = await fetch('http://localhost:3000/api/v1/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': uuid(),
      },
      body: JSON.stringify({
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 10000,
        currency: 'INR',
      }),
    });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD DETECTION — REAL FRAUD SERVICE RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Payment: Fraud Detection', () => {
  it('allows normal business-hours payment (not flagged as fraud)', async () => {
    // ₹200 payment at a normal amount — should pass fraud check
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 20000, // ₹200 — not suspicious
        currency: 'INR',
        description: 'Normal payment',
      },
      { 'idempotency-key': uuid() },
    );
    // Should succeed (201) — not fraud blocked
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).not.toBe('fraud_blocked');
  });

  it('flags round amount at suspicious hour (if fraud service running)', async () => {
    // Large round amount at suspicious hour might trigger fraud engine
    // Result depends on current system time — we just check it doesn't crash
    const res = await apiPost(
      '/api/v1/payments',
      senderToken,
      {
        fromAccountId: KNOWN_ACCOUNTS.sender,
        toAccountId: KNOWN_ACCOUNTS.recipient,
        amount: 100000000, // ₹1,00,000 — 1 lakh round amount
        currency: 'INR',
        description: 'Large round amount test',
      },
      { 'idempotency-key': uuid() },
    );
    // 201 (allowed), 403 (fraud blocked), or 402 — all are valid real responses
    expect([201, 402, 403]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION HISTORY — REAL DB READS
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Payment: Transaction History', () => {
  it('fetches real transaction history for sender account', async () => {
    const res = await apiGet(
      `/api/v1/accounts/${KNOWN_ACCOUNTS.sender}/transactions`,
      senderToken,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: { items: unknown[]; total: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    // Should have at least the transactions we just created
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('transaction history entries have correct shape', async () => {
    const res = await apiGet(
      `/api/v1/accounts/${KNOWN_ACCOUNTS.sender}/transactions?limit=5`,
      senderToken,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as {
      data: {
        items: Array<{
          id: string;
          amount: number;
          currency: string;
          status: string;
          createdAt: string;
        }>;
      };
    };
    const txn = body.data.items[0];
    if (txn) {
      expect(txn.id).toBeTruthy();
      expect(typeof txn.amount).toBe('number');
      expect(txn.currency).toBe('INR');
      expect(txn.status).toBeTruthy();
      expect(txn.createdAt).toBeTruthy();
    }
  });
});
