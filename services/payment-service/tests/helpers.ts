// ─────────────────────────────────────────────────────────
// tests/helpers.ts — Shared test utilities for all test files
//
// This file contains shared utilities used across all tests.
// It creates fake data that looks real so our tests are
// meaningful. All amounts are in paise (integer).
// ─────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';

// Creates a fake sender account with ₹10,000 balance
export function makeSenderAccount(overrides = {}) {
  return {
    id: randomUUID(),
    user_id: randomUUID(),
    balance: 1000000, // ₹10,000 in paise
    currency: 'INR',
    status: 'active',
    version: 0,
    created_at: new Date('2025-01-01T00:00:00Z'), // old account
    updated_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// Creates a fake recipient account with ₹0 balance
export function makeRecipientAccount(overrides = {}) {
  return {
    id: randomUUID(),
    user_id: randomUUID(),
    balance: 0,
    currency: 'INR',
    status: 'active',
    version: 0,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// Creates fake payment parameters
export function makePaymentParams(overrides = {}) {
  return {
    idempotencyKey: randomUUID(),
    fromAccountId: randomUUID(),
    toAccountId: randomUUID(),
    amount: 20000, // ₹200 in paise
    currency: 'INR' as const,
    description: 'test payment',
    userId: randomUUID(),
    traceId: randomUUID(),
    ...overrides,
  };
}

// Creates a fake completed transaction (DB row format, snake_case)
export function makeTransaction(overrides = {}) {
  return {
    id: randomUUID(),
    idempotency_key: randomUUID(),
    from_account_id: randomUUID(),
    to_account_id: randomUUID(),
    amount: 20000,
    currency: 'INR',
    status: 'completed',
    fraud_score: 12,
    fraud_action: 'approve',
    metadata: { description: 'test' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Creates a fake fraud result (low risk, approve)
export function makeFraudResult(overrides = {}) {
  return {
    score: 12,
    action: 'approve',
    signals: [],
    ...overrides,
  };
}

// Creates a fake high-risk fraud result (decline)
export function makeHighRiskFraudResult() {
  return {
    score: 85,
    action: 'decline',
    signals: [
      {
        ruleName: 'VELOCITY_CHECK',
        scoreAdded: 25,
        signalData: { transactionsInLastMinute: 10 },
      },
      {
        ruleName: 'AMOUNT_ANOMALY',
        scoreAdded: 30,
        signalData: { amount: 5000000, averageAmount: 50000, threshold: 5 },
      },
      {
        ruleName: 'UNUSUAL_HOUR',
        scoreAdded: 10,
        signalData: { hour: 3 },
      },
      {
        ruleName: 'NEW_ACCOUNT',
        scoreAdded: 15,
        signalData: { accountAgeInDays: 1 },
      },
      {
        ruleName: 'ROUND_AMOUNT',
        scoreAdded: 5,
        signalData: { amount: 5000000 },
      },
    ],
  };
}

// Creates a fake fraud input
export function makeFraudInput(overrides = {}) {
  return {
    fromAccountId: randomUUID(),
    toAccountId: randomUUID(),
    amount: 50000,
    accountCreatedAt: new Date('2025-01-01T00:00:00Z'),
    traceId: randomUUID(),
    ...overrides,
  };
}

// Waits for a condition to be true (useful in concurrent tests)
export function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('waitFor timed out'));
    }, timeoutMs);
  });
}
