// ─────────────────────────────────────────────────────────
// tests/integration/setup.ts — Integration Test Database Setup
//
// This file sets up a clean database before each
// integration test. We use a REAL test database —
// never the production database, never mocks.
// Integration tests are slower but they catch bugs
// that unit tests cannot — like wrong SQL queries
// or missing database indexes.
// ─────────────────────────────────────────────────────────

import { db } from '@settlr/database';
import { redis } from '@settlr/redis';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Wipes all data from test tables in correct order.
// Order matters because of foreign key constraints.
// For example: ledger_entries references transactions,
// so ledger_entries must be deleted first.
export async function cleanDatabase(): Promise<void> {
  await db('webhook_deliveries').delete();
  await db('webhook_endpoints').delete();
  await db('fraud_signals').delete();
  await db('ledger_entries').delete();
  await db('transactions').delete();
  await db('accounts').delete();
  await db('users').delete();
}

// Cleans all Redis test keys.
// We prefix test keys with 'test:' to separate them.
export async function cleanRedis(): Promise<void> {
  const testKeys = await redis.keys('test:*');
  const lockKeys = await redis.keys('lock:*');
  const idemKeys = await redis.keys('idempotency:*');
  const fraudKeys = await redis.keys('fraud:*');
  const allKeys = [
    ...testKeys,
    ...lockKeys,
    ...idemKeys,
    ...fraudKeys,
  ];
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}

// Creates a real user in the test database.
// Returns the complete user object with all fields.
export async function createTestUser(overrides = {}) {
  const [user] = await db('users')
    .insert({
      id: randomUUID(),
      email: `test-${Date.now()}-${Math.random()}@settlr.dev`,
      name: 'Test User',
      password_hash: await bcrypt.hash('TestPass123!', 12),
      kyc_status: 'verified',
      is_active: true,
      ...overrides,
    })
    .returning('*');
  return user;
}

// Creates a real account in the test database.
// balancePaise: amount in paise. ₹10,000 = 1000000 paise.
export async function createTestAccount(
  userId: string,
  balancePaise: number = 1000000
) {
  const [account] = await db('accounts')
    .insert({
      id: randomUUID(),
      user_id: userId,
      balance: balancePaise,
      currency: 'INR',
      status: 'active',
      version: 0,
    })
    .returning('*');
  return account;
}

// Reads current account balance directly from database.
// Use this to verify balances after payments.
export async function getAccountBalance(
  accountId: string
): Promise<number> {
  const account = await db('accounts').where({ id: accountId }).first();
  return Number(account.balance);
}

// Reads all ledger entries for a transaction.
// Used to verify double-entry accounting.
export async function getLedgerEntries(transactionId: string) {
  return db('ledger_entries').where({ transaction_id: transactionId });
}

// Reads all fraud signals for a transaction.
export async function getFraudSignals(transactionId: string) {
  return db('fraud_signals').where({ transaction_id: transactionId });
}
