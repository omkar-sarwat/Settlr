# SETTLR — Complete Project Instructions for GitHub Copilot

> **How to use this file:** Attach this file to every Copilot Chat session. Start every prompt with:
> _"Read the attached SETTLR_COPILOT.md file fully before writing any code. Follow every rule in it."_
> Copilot will then generate code that perfectly matches this project's standards.

---

## TABLE OF CONTENTS

1. [What Is This Project](#1-what-is-this-project)
2. [Tech Stack — Every Tool We Use](#2-tech-stack--every-tool-we-use)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Database Schema — Full SQL](#4-database-schema--full-sql)
5. [Service-by-Service Build Guide](#5-service-by-service-build-guide)
6. [Core Rules Copilot Must Follow Always](#6-core-rules-copilot-must-follow-always)
7. [Payment Service — Step-by-Step](#7-payment-service--step-by-step)
8. [Fraud Engine — All 6 Rules](#8-fraud-engine--all-6-rules)
9. [Webhook Service — Stripe-Style](#9-webhook-service--stripe-style)
10. [Kafka Events — Topics and Payloads](#10-kafka-events--topics-and-payloads)
11. [API Endpoints — Every Route](#11-api-endpoints--every-route)
12. [Environment Variables — All Services](#12-environment-variables--all-services)
13. [Error Handling Standard](#13-error-handling-standard)
14. [Testing Rules](#14-testing-rules)
15. [Docker Setup](#15-docker-setup)
16. [What Copilot Must NEVER Do](#16-what-copilot-must-never-do)
17. [Exact Copilot Prompts to Use](#17-exact-copilot-prompts-to-use)

---

## 1. WHAT IS THIS PROJECT

**Settlr** is a distributed payment processing backend built to demonstrate production-grade fintech engineering. It is a portfolio project for a FAANG job application. Every technical decision must be intentional, explainable, and reflect real-world financial system design.

### The Story Behind It
> "I got curious about how UPI moves money between different banks in under 2 seconds. I tried to understand the architecture and built a simplified version from scratch. That curiosity became Settlr."

### What It Does
- Users create accounts witrunh a balance (in paise — never float)
- Users can send money to other users instantly
- Every transfer is atomic — money never disappears or duplicates
- Every transfer goes through a fraud scoring engine before processing
- Merchants can register webhook URLs to receive real-time payment events
- All events flow through Kafka between microservices
- Full observability: structured logs, metrics, traces

### Why It's Impressive to Recruiters
- Distributed locking prevents race conditions under concurrent load
- Idempotent API prevents double charges on network retries
- Double-entry ledger ensures every paisa is always accounted for
- Fraud engine scores 6 signals in parallel in under 20ms
- Webhook delivery with exponential backoff retry (exactly like Stripe)
- Load tested at 500 concurrent users with documented results

---

## 2. TECH STACK — EVERY TOOL WE USE

| Layer | Tool | Free Tier | Why This Choice |
|-------|------|-----------|-----------------|
| Language | TypeScript + Node.js | ✅ Free | Type safety critical for financial code |
| Framework | Express.js | ✅ Free | Lightweight, widely known |
| Database | Supabase (PostgreSQL) | ✅ 500MB free | ACID transactions required for money |
| Cache + Locks | Upstash Redis | ✅ 10k req/day | Fast atomic operations, TTL support |
| Message Queue | Upstash Kafka | ✅ 10k msg/day | Industry standard event streaming |
| ORM | Knex.js | ✅ Free | SQL query builder, supports transactions |
| Validation | Zod | ✅ Free | Runtime type validation for all inputs |
| Auth | JWT (jsonwebtoken) | ✅ Free | Stateless, scalable |
| Password Hash | bcrypt | ✅ Free | Secure password storage |
| Testing | Vitest | ✅ Free | Fast, compatible with TypeScript |
| Email | Resend.com | ✅ 3k/month | Simple API, reliable delivery |
| Monitoring | Grafana Cloud | ✅ Free tier | Metrics dashboards |
| CI/CD | GitHub Actions | ✅ Free public repos | Industry standard |
| Containers | Docker + Docker Compose | ✅ Free | One-command local setup |
| Hosting | Railway.app | ✅ $5 credit/month | Free for small projects |
| Docs | Swagger UI | ✅ Free | Self-hosted API docs |

**Total monthly cost: ₹0**

---

## 3. COMPLETE FOLDER STRUCTURE

Copilot must create files in these exact locations. Never deviate from this structure.

```
settlr/
│
├── services/                          ← Each folder = one independent microservice
│   │
│   ├── api-gateway/                   ← Entry point. Routes + Auth + Rate limiting only
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts         ← JWT verification
│   │   │   │   ├── rateLimit.middleware.ts    ← Redis sliding window rate limiter
│   │   │   │   ├── requestId.middleware.ts    ← Attach UUID to every request
│   │   │   │   └── validate.middleware.ts     ← Zod schema validation
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── account.routes.ts
│   │   │   │   └── payment.routes.ts
│   │   │   └── index.ts                       ← Express app bootstrap
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── account-service/               ← Account creation, balance queries
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── account.handler.ts
│   │   │   ├── services/
│   │   │   │   └── account.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── account.repository.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── payment-service/               ← THE CORE. Atomic transfers, idempotency, ledger
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── payment.handler.ts
│   │   │   ├── services/
│   │   │   │   ├── payment.service.ts         ← Main transfer logic
│   │   │   │   ├── idempotency.service.ts     ← Redis idempotency key management
│   │   │   │   └── ledger.service.ts          ← Double-entry ledger entries
│   │   │   ├── repositories/
│   │   │   │   ├── payment.repository.ts
│   │   │   │   └── ledger.repository.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── payment.service.test.ts
│   │   │   │   └── idempotency.service.test.ts
│   │   │   └── integration/
│   │   │       └── transfer.integration.test.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── fraud-service/                 ← 6-rule parallel fraud scoring engine
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── fraudEngine.ts             ← Runs all rules in Promise.all()
│   │   │   │   └── rules/
│   │   │   │       ├── velocityRule.ts
│   │   │   │       ├── amountAnomalyRule.ts
│   │   │   │       ├── unusualHourRule.ts
│   │   │   │       ├── newAccountRule.ts
│   │   │   │       ├── roundAmountRule.ts
│   │   │   │       └── recipientRiskRule.ts
│   │   │   ├── handlers/
│   │   │   │   └── fraud.handler.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   └── unit/
│   │   │       └── fraudEngine.test.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── webhook-service/               ← Stripe-style webhook delivery + retry
│   │   ├── src/
│   │   │   ├── dispatcher.ts                  ← Sends webhook POST requests
│   │   │   ├── signer.ts                      ← HMAC-SHA256 payload signing
│   │   │   ├── retryWorker.ts                 ← Polls DB for failed deliveries to retry
│   │   │   ├── handlers/
│   │   │   │   └── webhook.handler.ts         ← Register/delete webhook endpoints
│   │   │   ├── repositories/
│   │   │   │   └── webhook.repository.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   └── unit/
│   │   │       └── dispatcher.test.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── notification-service/          ← Email alerts via Resend.com
│       ├── src/
│       │   ├── emailService.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── packages/                          ← Shared code used by all services
│   ├── database/
│   │   ├── client.ts                  ← Knex.js singleton
│   │   └── migrations/                ← All SQL migration files
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_accounts.sql
│   │       ├── 003_create_transactions.sql
│   │       ├── 004_create_ledger.sql
│   │       ├── 005_create_fraud_signals.sql
│   │       └── 006_create_webhooks.sql
│   ├── redis/
│   │   └── client.ts                  ← Upstash Redis singleton
│   ├── kafka/
│   │   ├── producer.ts                ← Publish events
│   │   └── consumer.ts                ← Subscribe to topics
│   ├── logger/
│   │   └── index.ts                   ← Structured JSON logger
│   └── types/
│       └── index.ts                   ← All shared TypeScript interfaces
│
├── docker-compose.yml                 ← Run everything locally with one command
├── docker-compose.prod.yml
├── .env.example                       ← Template for all required env vars
├── .github/
│   └── workflows/
│       └── ci.yml                     ← GitHub Actions pipeline
├── DECISIONS.md                       ← Why we made each technical choice
└── README.md                          ← Project story + architecture + load test results
```

---

## 4. DATABASE SCHEMA — FULL SQL

Run all of this in Supabase SQL Editor. Run in order — tables reference each other.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  kyc_status    VARCHAR(20) DEFAULT 'pending'
                  CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: ACCOUNTS
-- NOTE: balance is in PAISE (smallest unit). ₹100 = 10000 paise.
-- NEVER store float. NEVER remove the CHECK constraint.
-- version column is for optimistic locking — increment on every update.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),  -- NEVER remove this constraint
  currency    CHAR(3) NOT NULL DEFAULT 'INR',
  status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'frozen', 'closed')),
  version     INTEGER NOT NULL DEFAULT 0,   -- For optimistic locking
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: TRANSACTIONS
-- idempotency_key: client-generated UUID. UNIQUE prevents double charges.
-- fraud_score: 0-100. Stored for audit trail.
-- status flow: pending → processing → completed | failed | reversed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   VARCHAR(255) UNIQUE NOT NULL,
  from_account_id   UUID REFERENCES accounts(id),
  to_account_id     UUID REFERENCES accounts(id),
  amount            BIGINT NOT NULL CHECK (amount > 0),  -- In paise
  currency          CHAR(3) NOT NULL DEFAULT 'INR',
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  failure_reason    TEXT,
  fraud_score       SMALLINT CHECK (fraud_score BETWEEN 0 AND 100),
  fraud_action      VARCHAR(20) CHECK (fraud_action IN ('approve', 'review', 'challenge', 'decline')),
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: LEDGER ENTRIES (Double-entry bookkeeping)
-- Every transaction creates EXACTLY 2 rows: one debit, one credit.
-- balance_before + balance_after creates an audit trail for every balance change.
-- NEVER hard delete these rows. EVER.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  entry_type      VARCHAR(6) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount          BIGINT NOT NULL CHECK (amount > 0),
  balance_before  BIGINT NOT NULL,
  balance_after   BIGINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: FRAUD SIGNALS
-- Each fraud rule that fires creates one row here.
-- Used for audit trail and future ML training data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fraud_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  rule_name       VARCHAR(100) NOT NULL,
  score_added     SMALLINT NOT NULL,
  signal_data     JSONB DEFAULT '{}',  -- Rule-specific data (e.g. velocity count)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: WEBHOOK ENDPOINTS
-- Merchants register URLs here to receive event notifications.
-- secret is used for HMAC-SHA256 signing. Never expose in API responses.
-- events array: e.g. ['payment.completed', 'payment.failed']
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  url         TEXT NOT NULL,
  secret      VARCHAR(255) NOT NULL,  -- Generated on creation, shown only once
  events      TEXT[] NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: WEBHOOK DELIVERIES
-- Every delivery attempt (including retries) is one row.
-- next_retry_at is set by exponential backoff schedule.
-- status flow: pending → delivered | retrying → failed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id),
  transaction_id  UUID REFERENCES transactions(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'retrying', 'failed')),
  attempt_number  SMALLINT DEFAULT 1,
  response_code   SMALLINT,
  response_body   TEXT,
  next_retry_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES — Add these for query performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_from_account ON transactions(from_account_id, created_at DESC);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status = 'pending';
CREATE INDEX idx_ledger_account ON ledger_entries(account_id, created_at DESC);
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_fraud_signals_transaction ON fraud_signals(transaction_id);
CREATE INDEX idx_webhook_deliveries_retry
  ON webhook_deliveries(next_retry_at)
  WHERE status = 'retrying';
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
```

---

## 5. SERVICE-BY-SERVICE BUILD GUIDE

Build services in this exact order. Each depends on the previous.

```
Week 1: packages/ setup → api-gateway → account-service
Week 2: payment-service (core logic)
Week 3: fraud-service → webhook-service → notification-service
Week 4: Testing → CI/CD → Load testing → README
```

### Build Order Within Each Service

For every service, always build in this order:
1. `types/index.ts` — define all interfaces first
2. `repositories/` — data access layer
3. `services/` — business logic
4. `handlers/` — HTTP layer
5. `routes/` — route registration
6. `index.ts` — server bootstrap
7. `tests/` — unit tests for services and repositories

---

## 6. CORE RULES COPILOT MUST FOLLOW ALWAYS

These rules apply to **every single file** in this project. No exceptions.

### 6.1 Language Rules

```typescript
// ✅ ALWAYS DO THIS
'use strict';  // Always strict TypeScript (tsconfig has strict: true)

// Named exports only — never default exports
export const paymentService = { ... };
export interface IPaymentParams { ... }

// Explicit return types on all functions
export async function initiatePayment(params: IPaymentParams): Promise<ITransaction> { }

// async/await only — never callbacks or raw .then() chains
const account = await accountRepository.findById(id);

// const everywhere — never var
const amount = 1000;
let retryCount = 0;  // let only when value must change

// Optional chaining and nullish coalescing
const balance = account?.balance ?? 0;

// Early returns — never deep nesting
if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
if (account.status !== 'active') return { success: false, error: 'ACCOUNT_FROZEN' };
// ... rest of logic at top level
```

### 6.2 Money Rules — Financial Critical

```typescript
// ✅ CORRECT — All money in paise (integer)
const amount = 9950;           // ₹99.50 in paise
const balance = 100000;        // ₹1,000.00 in paise

// ✅ CORRECT — Display formatting (only at presentation layer)
function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

// ✅ CORRECT — Accept user input (e.g. "99.50") and convert
function parseCurrency(rupeesString: string): number {
  return Math.round(parseFloat(rupeesString) * 100);
}

// ❌ NEVER — Float for money
const amount = 99.50;           // WRONG
const balance = 1000.00;        // WRONG
const result = 0.1 + 0.2;      // = 0.30000000000000004 — BUG
```

### 6.3 Logging Rules

```typescript
// packages/logger/index.ts — Always use this, never console.log
import { logger } from '@settlr/logger';

// ✅ CORRECT — Structured with context
logger.info('payment_initiated', {
  trace_id: req.traceId,
  user_id: req.userId,
  from_account: params.fromAccountId,
  amount_paise: params.amount,
  idempotency_key: params.idempotencyKey,
});

logger.error('payment_failed', {
  trace_id: req.traceId,
  error: error.message,
  stack: error.stack,
  params,
});

// ❌ NEVER
console.log('payment started');
console.error(error);
```

### 6.4 Environment Variables

```typescript
// packages/config/index.ts — Always validate at startup
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    // This intentionally crashes the service if config is missing
    throw new Error(`FATAL: Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('UPSTASH_REDIS_URL'),
  kafkaBroker: requireEnv('KAFKA_BROKER'),
  kafkaUsername: requireEnv('KAFKA_USERNAME'),
  kafkaPassword: requireEnv('KAFKA_PASSWORD'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

### 6.5 Validation — Every Request

```typescript
// Use Zod for all incoming request validation
import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  fromAccountId: z.string().uuid('Must be valid UUID'),
  toAccountId: z.string().uuid('Must be valid UUID'),
  amount: z.number()
    .int('Amount must be integer (paise)')
    .positive('Amount must be positive')
    .max(10_000_000_00, 'Amount exceeds maximum transfer limit'), // ₹1 crore in paise
  currency: z.literal('INR'),
  description: z.string().max(255).optional(),
});

// In middleware — validate before handler is called
export const validate = (schema: z.ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
```

### 6.6 Layered Architecture — Strict Separation

```
Handler  →  Service  →  Repository  →  Database
  ↓            ↓             ↓
HTTP only   Business      SQL only
No logic    No SQL        No logic
```

```typescript
// ✅ CORRECT — Handler only does HTTP things
export async function initiatePaymentHandler(req: Request, res: Response): Promise<void> {
  const result = await paymentService.initiatePayment({
    ...req.body,
    userId: req.userId,   // From JWT middleware
    traceId: req.traceId, // From requestId middleware
  });

  if (!result.success) {
    res.status(result.statusCode).json(result);
    return;
  }

  res.status(201).json(result);
}

// ❌ WRONG — Handler doing business logic
export async function initiatePaymentHandler(req, res) {
  const account = await db('accounts').where({ id: req.body.fromAccountId }).first(); // WRONG
  if (account.balance < req.body.amount) { /* ... */ }  // Business logic in handler — WRONG
}
```

---

## 7. PAYMENT SERVICE — STEP-BY-STEP

This is the most critical service. Every step must happen in this exact order.

### 7.1 Atomic Transfer — 17 Steps in Order

```typescript
// services/payment-service/src/services/payment.service.ts

export const paymentService = {
  async initiatePayment(params: IInitiatePaymentParams): Promise<IResult<ITransaction>> {

    // ── STEP 1: Idempotency Check ──────────────────────────────────────────
    // Check Redis BEFORE anything else. If key exists, return cached response.
    // This prevents double charges on network retries.
    const cached = await idempotencyService.get(params.idempotencyKey);
    if (cached) {
      logger.info('idempotency_cache_hit', { key: params.idempotencyKey });
      return { success: true, data: cached, fromCache: true };
    }

    // ── STEP 2: Acquire Distributed Locks ─────────────────────────────────
    // Sort UUIDs alphabetically BEFORE locking. This is critical.
    // If Thread A locks account-1 then account-2, and Thread B locks account-2
    // then account-1, they deadlock. Sorting prevents this.
    const lockOrder = [params.fromAccountId, params.toAccountId].sort();
    const lockKey1 = `lock:account:${lockOrder[0]}`;
    const lockKey2 = `lock:account:${lockOrder[1]}`;

    const lock1 = await redis.set(lockKey1, '1', 'EX', 10, 'NX');
    const lock2 = await redis.set(lockKey2, '1', 'EX', 10, 'NX');

    if (!lock1 || !lock2) {
      await redis.del(lockKey1);
      await redis.del(lockKey2);
      return { success: false, error: 'ACCOUNT_LOCKED', statusCode: 409,
               message: 'Account is busy. Retry in a moment.' };
    }

    try {

      // ── STEP 3: Fraud Check ─────────────────────────────────────────────
      // Publish to Kafka and wait for fraud-service response.
      // Fraud check runs 6 rules in parallel — max 20ms.
      const fraudResult = await fraudCheckService.check({
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        traceId: params.traceId,
      });

      // ── STEP 4: Reject High-Risk Transactions ───────────────────────────
      if (fraudResult.action === 'decline') {
        await publishEvent('payment.fraud_blocked', {
          traceId: params.traceId,
          fromAccountId: params.fromAccountId,
          fraudScore: fraudResult.score,
        });
        return { success: false, error: 'FRAUD_BLOCKED', statusCode: 403,
                 message: 'Transaction declined by risk engine.' };
      }

      // ── STEPS 5–13: Atomic Database Transaction ─────────────────────────
      // Everything from here until COMMIT is one atomic unit.
      // If anything throws, the entire DB transaction rolls back automatically.
      const transaction = await db.transaction(async (trx) => {

        // ── STEP 6: Lock Rows in Database ────────────────────────────────
        // .forUpdate() adds SELECT ... FOR UPDATE — row-level DB lock.
        // Belt and suspenders: Redis lock + DB lock together.
        const fromAccount = await trx('accounts')
          .where({ id: params.fromAccountId, status: 'active' })
          .forUpdate()
          .first();

        if (!fromAccount) throw new AppError('ACCOUNT_NOT_FOUND', 404);

        const toAccount = await trx('accounts')
          .where({ id: params.toAccountId, status: 'active' })
          .forUpdate()
          .first();

        if (!toAccount) throw new AppError('RECIPIENT_NOT_FOUND', 404);

        // ── STEP 7: Balance Check ─────────────────────────────────────────
        if (fromAccount.balance < params.amount) {
          throw new AppError('INSUFFICIENT_BALANCE', 422);
        }

        // ── STEP 8: Update Sender — Optimistic Lock ───────────────────────
        // WHERE version = fromAccount.version is the optimistic lock.
        // If another process already changed this account, version won't match
        // and rowsUpdated will be 0. We then retry.
        const rowsUpdated = await trx('accounts')
          .where({ id: params.fromAccountId, version: fromAccount.version })
          .update({
            balance: fromAccount.balance - params.amount,
            version: fromAccount.version + 1,
            updated_at: new Date(),
          });

        // ── STEP 9: Handle Concurrent Modification ────────────────────────
        if (rowsUpdated === 0) {
          throw new AppError('CONCURRENT_MODIFICATION', 409);
        }

        // ── STEP 10: Update Recipient ─────────────────────────────────────
        await trx('accounts')
          .where({ id: params.toAccountId })
          .update({
            balance: toAccount.balance + params.amount,
            version: toAccount.version + 1,
            updated_at: new Date(),
          });

        // ── STEP 11: Write Ledger Entries (Double-Entry) ──────────────────
        // Every transfer creates exactly 2 ledger rows.
        // Debit = money leaving sender. Credit = money entering recipient.
        await ledgerService.createEntries(trx, {
          transactionId: newTransaction.id, // Created in step 12
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          fromBalanceBefore: fromAccount.balance,
          fromBalanceAfter: fromAccount.balance - params.amount,
          toBalanceBefore: toAccount.balance,
          toBalanceAfter: toAccount.balance + params.amount,
        });

        // ── STEP 12: Create Transaction Record ────────────────────────────
        const [newTransaction] = await trx('transactions').insert({
          idempotency_key: params.idempotencyKey,
          from_account_id: params.fromAccountId,
          to_account_id: params.toAccountId,
          amount: params.amount,
          currency: 'INR',
          status: 'completed',
          fraud_score: fraudResult.score,
          fraud_action: fraudResult.action,
        }).returning('*');

        // ── STEP 13: Commit (automatic when transaction() callback returns) ─
        return newTransaction;
      });
      // DB transaction committed here ↑

      // ── STEP 14: Release Locks (in finally — see below) ─────────────────

      // ── STEP 15: Cache Idempotency Response ───────────────────────────
      await idempotencyService.set(params.idempotencyKey, transaction);

      // ── STEP 16: Publish Kafka Event ──────────────────────────────────
      // CRITICAL: Only publish AFTER DB commit succeeds.
      // Never publish events optimistically before data is saved.
      await publishEvent('payment.completed', {
        transactionId: transaction.id,
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        currency: 'INR',
        fraudScore: fraudResult.score,
      });

      // ── STEP 17: Return Success ────────────────────────────────────────
      return { success: true, data: transaction, statusCode: 201 };

    } catch (error) {
      await publishEvent('payment.failed', {
        idempotencyKey: params.idempotencyKey,
        reason: error.message,
      });
      throw error;

    } finally {
      // ── STEP 14: ALWAYS Release Locks ─────────────────────────────────
      // finally runs even if an error was thrown.
      // Never put lock release anywhere else.
      await redis.del(lockKey1);
      await redis.del(lockKey2);
    }
  }
};
```

### 7.2 Idempotency Service

```typescript
// services/payment-service/src/services/idempotency.service.ts
import { redis } from '@settlr/redis';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

export const idempotencyService = {
  async get(key: string): Promise<ITransaction | null> {
    const cached = await redis.get(`idempotency:${key}`);
    return cached ? JSON.parse(cached) : null;
  },

  async set(key: string, data: ITransaction): Promise<void> {
    await redis.setex(
      `idempotency:${key}`,
      IDEMPOTENCY_TTL_SECONDS,
      JSON.stringify(data)
    );
  },
};
```

### 7.3 Ledger Service

```typescript
// services/payment-service/src/services/ledger.service.ts

export const ledgerService = {
  async createEntries(trx: Knex.Transaction, params: ILedgerParams): Promise<void> {
    // Always insert BOTH entries in same transaction
    // If either fails, both are rolled back
    await trx('ledger_entries').insert([
      {
        transaction_id: params.transactionId,
        account_id: params.fromAccountId,
        entry_type: 'debit',
        amount: params.amount,
        balance_before: params.fromBalanceBefore,
        balance_after: params.fromBalanceAfter,
      },
      {
        transaction_id: params.transactionId,
        account_id: params.toAccountId,
        entry_type: 'credit',
        amount: params.amount,
        balance_before: params.toBalanceBefore,
        balance_after: params.toBalanceAfter,
      }
    ]);
  },
};
```

---

## 8. FRAUD ENGINE — ALL 6 RULES

### 8.1 Engine Runner — Always Promise.all()

```typescript
// services/fraud-service/src/engine/fraudEngine.ts
import { FraudResult, FraudSignal } from '@settlr/types';
import { checkVelocity } from './rules/velocityRule';
import { checkAmountAnomaly } from './rules/amountAnomalyRule';
import { checkUnusualHour } from './rules/unusualHourRule';
import { checkNewAccount } from './rules/newAccountRule';
import { checkRoundAmount } from './rules/roundAmountRule';
import { checkRecipientRisk } from './rules/recipientRiskRule';

export async function runFraudEngine(input: IFraudInput): Promise<FraudResult> {
  // ALL rules run simultaneously — total time = slowest single rule, not sum of all
  const [
    velocitySignal,
    amountSignal,
    hourSignal,
    newAccountSignal,
    roundAmountSignal,
    recipientSignal,
  ] = await Promise.all([
    checkVelocity(input.fromAccountId),
    checkAmountAnomaly(input.fromAccountId, input.amount),
    checkUnusualHour(),
    checkNewAccount(input.accountCreatedAt),
    checkRoundAmount(input.amount),
    checkRecipientRisk(input.toAccountId),
  ]);

  // Filter out null signals (rule didn't fire)
  const signals: FraudSignal[] = [
    velocitySignal, amountSignal, hourSignal,
    newAccountSignal, roundAmountSignal, recipientSignal,
  ].filter((s): s is FraudSignal => s !== null);

  const totalScore = signals.reduce((sum, s) => sum + s.scoreAdded, 0);
  const cappedScore = Math.min(totalScore, 100); // Never exceed 100

  return {
    score: cappedScore,
    action: scoreToAction(cappedScore),
    signals,
  };
}

function scoreToAction(score: number): 'approve' | 'review' | 'challenge' | 'decline' {
  if (score < 30) return 'approve';
  if (score < 60) return 'review';
  if (score < 80) return 'challenge';
  return 'decline';
}
```

### 8.2 All 6 Rules — Build Each in Its Own File

**Rule 1 — VELOCITY_CHECK (+25 points)**
```typescript
// If account makes >3 transactions in 60 seconds
export async function checkVelocity(accountId: string): Promise<FraudSignal | null> {
  const key = `fraud:velocity:${accountId}`;
  const count = await redis.incr(key);       // Increment counter
  await redis.expire(key, 60);               // Reset every 60 seconds
  if (count > 3) {
    return { ruleName: 'VELOCITY_CHECK', scoreAdded: 25,
             data: { transactionsInLastMinute: count } };
  }
  return null;
}
```

**Rule 2 — AMOUNT_ANOMALY (+30 points)**
```typescript
// If amount > 5x the account's average transaction
export async function checkAmountAnomaly(accountId: string, amount: number): Promise<FraudSignal | null> {
  const key = `fraud:amounts:${accountId}`;
  await redis.zadd(key, Date.now(), amount.toString());  // Sorted set of amounts
  await redis.zremrangebyrank(key, 0, -21);              // Keep last 20 only
  await redis.expire(key, 2592000);                      // 30 day TTL

  const amounts = (await redis.zrange(key, 0, -1)).map(Number);
  if (amounts.length < 3) return null;                   // Not enough history

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (amount > avg * 5) {
    return { ruleName: 'AMOUNT_ANOMALY', scoreAdded: 30,
             data: { amount, averageAmount: Math.round(avg), threshold: 5 } };
  }
  return null;
}
```

**Rule 3 — UNUSUAL_HOUR (+10 points)**
```typescript
// If transaction happens between 1:00am – 5:00am IST
export async function checkUnusualHour(): Promise<FraudSignal | null> {
  const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // UTC+5:30
  const hour = nowIST.getUTCHours();
  if (hour >= 1 && hour <= 5) {
    return { ruleName: 'UNUSUAL_HOUR', scoreAdded: 10, data: { hour } };
  }
  return null;
}
```

**Rule 4 — NEW_ACCOUNT (+15 points)**
```typescript
// If sending account is less than 7 days old
export async function checkNewAccount(accountCreatedAt: Date): Promise<FraudSignal | null> {
  const ageMs = Date.now() - accountCreatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) {
    return { ruleName: 'NEW_ACCOUNT', scoreAdded: 15,
             data: { accountAgeInDays: Math.floor(ageDays) } };
  }
  return null;
}
```

**Rule 5 — ROUND_AMOUNT (+5 points)**
```typescript
// If amount is a suspicious round number (common in fraud testing)
export async function checkRoundAmount(amount: number): Promise<FraudSignal | null> {
  // In paise: ₹1000 = 100000, ₹5000 = 500000, ₹10000 = 1000000, ₹50000 = 5000000
  const suspiciousAmounts = [100000, 500000, 1000000, 5000000];
  if (suspiciousAmounts.includes(amount)) {
    return { ruleName: 'ROUND_AMOUNT', scoreAdded: 5, data: { amount } };
  }
  return null;
}
```

**Rule 6 — RECIPIENT_RISK (+20 points)**
```typescript
// If recipient receives from >10 unique senders in last hour (money mule pattern)
export async function checkRecipientRisk(toAccountId: string): Promise<FraudSignal | null> {
  const key = `fraud:recipient:${toAccountId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 3600);  // 1 hour window
  if (count > 10) {
    return { ruleName: 'RECIPIENT_RISK', scoreAdded: 20,
             data: { uniqueSendersInLastHour: count } };
  }
  return null;
}
```

---

## 9. WEBHOOK SERVICE — STRIPE-STYLE

### 9.1 Retry Schedule — Never Change These Values

```typescript
// services/webhook-service/src/retryWorker.ts

const RETRY_DELAYS_SECONDS = [
  30,      // Retry 1 — 30 seconds after first failure
  300,     // Retry 2 — 5 minutes after retry 1
  1800,    // Retry 3 — 30 minutes after retry 2
  7200,    // Retry 4 — 2 hours after retry 3
  // After retry 4 fails → permanently mark as 'failed'
];

const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1; // 5 total attempts
const WEBHOOK_TIMEOUT_MS = 5000; // 5 second timeout on every request
```

### 9.2 HMAC Signing — Every Request

```typescript
// services/webhook-service/src/signer.ts
import crypto from 'crypto';

export function signPayload(secret: string, payload: string): string {
  // Identical to how Stripe signs webhooks
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Headers on every outgoing webhook:
const headers = {
  'Content-Type': 'application/json',
  'X-Settlr-Signature': signPayload(endpoint.secret, payloadString),
  'X-Settlr-Event': delivery.eventType,          // e.g. 'payment.completed'
  'X-Settlr-Delivery': delivery.id,              // UUID of this delivery
  'X-Settlr-Timestamp': Date.now().toString(),   // Unix timestamp
};
```

### 9.3 Dispatcher Logic

```typescript
// services/webhook-service/src/dispatcher.ts

export async function dispatchWebhook(
  transactionId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {

  const endpoints = await webhookRepository.findActiveByEvent(eventType);

  for (const endpoint of endpoints) {
    const delivery = await webhookRepository.createDelivery({
      endpointId: endpoint.id,
      transactionId,
      eventType,
      payload,
    });

    await attemptDelivery(delivery, endpoint);
  }
}

async function attemptDelivery(delivery: IDelivery, endpoint: IEndpoint): Promise<void> {
  const payloadString = JSON.stringify(delivery.payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: buildHeaders(endpoint.secret, payloadString, delivery),
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await webhookRepository.markDelivered(delivery.id, response.status);
    } else {
      await scheduleRetry(delivery, response.status);
    }

  } catch (error) {
    clearTimeout(timeout);
    await scheduleRetry(delivery, null);
  }
}

async function scheduleRetry(delivery: IDelivery, responseCode: number | null): Promise<void> {
  const delayIndex = delivery.attemptNumber - 1; // 0-indexed

  if (delayIndex >= RETRY_DELAYS_SECONDS.length) {
    // All retries exhausted
    await webhookRepository.markFailed(delivery.id, responseCode);
    return;
  }

  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_SECONDS[delayIndex] * 1000);
  await webhookRepository.scheduleRetry(delivery.id, nextRetryAt, responseCode);
}
```

---

## 10. KAFKA EVENTS — TOPICS AND PAYLOADS

### 10.1 All Topics

| Topic | Published By | Consumed By |
|-------|-------------|-------------|
| `payment.initiated` | payment-service | fraud-service |
| `payment.completed` | payment-service | webhook-service, notification-service |
| `payment.failed` | payment-service | webhook-service, notification-service |
| `payment.fraud_blocked` | payment-service | notification-service |
| `fraud.check.requested` | payment-service | fraud-service |
| `fraud.check.result` | fraud-service | payment-service |
| `webhook.delivery.failed` | webhook-service | notification-service |

### 10.2 Standard Event Envelope

```typescript
// packages/types/index.ts
interface KafkaEvent<T = unknown> {
  eventId: string;       // UUID — unique per event, for deduplication
  eventType: string;     // Topic name
  timestamp: string;     // ISO 8601 — new Date().toISOString()
  version: '1.0';        // Schema version for future migrations
  traceId: string;       // Correlates all events from one user request
  data: T;
}
```

### 10.3 Shared Kafka Producer

```typescript
// packages/kafka/producer.ts
import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';

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

const producer = kafka.producer();
let connected = false;

export async function publishEvent<T>(
  topic: string,
  data: T,
  traceId: string
): Promise<void> {
  if (!connected) {
    await producer.connect();
    connected = true;
  }

  const event: KafkaEvent<T> = {
    eventId: randomUUID(),
    eventType: topic,
    timestamp: new Date().toISOString(),
    version: '1.0',
    traceId,
    data,
  };

  await producer.send({
    topic,
    messages: [{ key: traceId, value: JSON.stringify(event) }],
  });
}
```

---

## 11. API ENDPOINTS — EVERY ROUTE

Build all of these. Use Swagger JSDoc comments on every route for auto-documentation.

### Auth Routes (`/api/v1/auth`)
```
POST   /register          → Create user account
POST   /login             → Returns JWT access token + refresh token
POST   /refresh           → Exchange refresh token for new access token
POST   /logout            → Invalidate refresh token
```

### Account Routes (`/api/v1/accounts`) — Protected
```
POST   /                  → Create new account for authenticated user
GET    /                  → List all accounts for authenticated user
GET    /:accountId        → Get single account with balance
GET    /:accountId/transactions  → Transaction history (paginated)
GET    /:accountId/ledger        → Ledger entries (paginated)
```

### Payment Routes (`/api/v1/payments`) — Protected
```
POST   /                  → Initiate transfer (requires Idempotency-Key header)
GET    /:transactionId    → Get transaction details with fraud signals
```

### Webhook Routes (`/api/v1/webhooks`) — Protected
```
POST   /                  → Register new webhook endpoint
GET    /                  → List all webhook endpoints
DELETE /:endpointId       → Delete webhook endpoint
GET    /:endpointId/deliveries  → Delivery history
```

### System Routes (No Auth)
```
GET    /health            → Service health (always returns 200 if up)
GET    /ready             → Checks DB + Redis connections
GET    /api-docs          → Swagger UI
```

### Standard Response Format

```typescript
// ALL API responses must use this shape — no exceptions
interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;      // Error code in SCREAMING_SNAKE_CASE
  message?: string;    // Human-readable message
  traceId: string;     // For debugging
}

// Success example
{
  "success": true,
  "data": { "id": "...", "amount": 5000, "status": "completed" },
  "traceId": "abc-123"
}

// Error example
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Account balance too low for this transfer",
  "traceId": "abc-123"
}
```

### HTTP Status Codes to Use

| Status | When |
|--------|------|
| 200 | Successful GET |
| 201 | Successful POST (resource created) |
| 400 | Validation error (bad input) |
| 401 | Missing or invalid JWT |
| 403 | Fraud blocked |
| 404 | Resource not found |
| 409 | Conflict (account locked, concurrent modification) |
| 422 | Business rule violation (insufficient balance) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

---

## 12. ENVIRONMENT VARIABLES — ALL SERVICES

Create this as `.env.example` in project root. Every developer copies this to `.env`.

```bash
# ─── DATABASE (Supabase) ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# ─── REDIS (Upstash) ─────────────────────────────────────────────────────────
UPSTASH_REDIS_URL=rediss://:[password]@[host].upstash.io:6380

# ─── KAFKA (Upstash) ─────────────────────────────────────────────────────────
KAFKA_BROKER=[host].upstash.io:9092
KAFKA_USERNAME=[username]
KAFKA_PASSWORD=[password]

# ─── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET=your-256-bit-secret-minimum-32-characters-long
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ─── EMAIL (Resend) ───────────────────────────────────────────────────────────
RESEND_API_KEY=re_[your_key]
EMAIL_FROM=noreply@settlr.dev

# ─── SERVICES ─────────────────────────────────────────────────────────────────
API_GATEWAY_PORT=3000
ACCOUNT_SERVICE_PORT=3001
PAYMENT_SERVICE_PORT=3002
FRAUD_SERVICE_PORT=3003
WEBHOOK_SERVICE_PORT=3004
NOTIFICATION_SERVICE_PORT=3005

# ─── INTERNAL SERVICE URLS ────────────────────────────────────────────────────
ACCOUNT_SERVICE_URL=http://account-service:3001
PAYMENT_SERVICE_URL=http://payment-service:3002
FRAUD_SERVICE_URL=http://fraud-service:3003

# ─── MISC ────────────────────────────────────────────────────────────────────
NODE_ENV=development
LOG_LEVEL=info
```

---

## 13. ERROR HANDLING STANDARD

### Custom Error Class

```typescript
// packages/types/errors.ts

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true; // vs programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// All error codes used in this project:
export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Account
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_FROZEN: 'ACCOUNT_FROZEN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Payment
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  FRAUD_BLOCKED: 'FRAUD_BLOCKED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_AMOUNT: 'INVALID_AMOUNT',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
```

### Global Error Handler

```typescript
// In every service's index.ts — register this as last middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const traceId = req.traceId || 'unknown';

  if (error instanceof AppError && error.isOperational) {
    // Expected errors — log at warn level
    logger.warn('operational_error', { traceId, code: error.code, message: error.message });
    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
      traceId,
    });
  }

  // Unexpected errors — log at error level with full stack
  logger.error('unexpected_error', { traceId, error: error.message, stack: error.stack });
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    traceId,
    // Never expose error.message or stack in production responses
  });
});
```

---

## 14. TESTING RULES

### What to Test and in What Order

```
Priority 1 (Must Have):
  ✅ payment.service.ts — all branches including error paths
  ✅ idempotency.service.ts — cache hit and cache miss
  ✅ fraudEngine.ts — each rule independently + combined score
  ✅ webhook dispatcher — success, failure, retry scheduling

Priority 2 (Should Have):
  ✅ account.service.ts — create, find, freeze
  ✅ ledger.service.ts — correct debit/credit pairs
  ✅ auth middleware — valid token, expired token, missing token

Priority 3 (Nice to Have):
  ✅ Rate limiter middleware
  ✅ Zod validation schemas
  ✅ Error handler middleware
```

### Test File Template

```typescript
// payment.service.test.ts
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock ALL external dependencies at the top ──────────────────────────────
// Never use real DB, Redis, or Kafka in unit tests
vi.mock('../repositories/payment.repository');
vi.mock('../services/idempotency.service');
vi.mock('../services/ledger.service');
vi.mock('@settlr/redis');
vi.mock('@settlr/kafka');

import { paymentService } from '../services/payment.service';
import { paymentRepository } from '../repositories/payment.repository';
import { idempotencyService } from '../services/idempotency.service';

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset all mocks before each test
  });

  describe('initiatePayment', () => {

    it('returns cached result without touching DB when idempotency key exists', async () => {
      // Arrange
      const cached = { id: 'txn-123', status: 'completed', amount: 5000 };
      (idempotencyService.get as Mock).mockResolvedValue(cached);

      // Act
      const result = await paymentService.initiatePayment({
        idempotencyKey: 'key-already-used',
        fromAccountId: crypto.randomUUID(),
        toAccountId: crypto.randomUUID(),
        amount: 5000,
        currency: 'INR',
        traceId: 'trace-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.data.id).toBe('txn-123');
      // Critical: verify DB was never touched
      expect(paymentRepository.create).not.toHaveBeenCalled();
    });

    it('throws INSUFFICIENT_BALANCE when sender balance < amount', async () => {
      // Arrange
      (idempotencyService.get as Mock).mockResolvedValue(null);
      (accountRepository.findById as Mock).mockResolvedValue({
        id: 'acc-1', balance: 500, version: 1, status: 'active'
      });

      // Act + Assert
      await expect(
        paymentService.initiatePayment({ amount: 1000, /* ... */ })
      ).rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('handles concurrent modification by retrying', async () => {
      // This tests the optimistic locking behavior
      // ... implementation
    });
  });
});
```

### Vitest Config

```typescript
// vitest.config.ts (in each service)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,      // CI fails if below 70%
        functions: 70,
        branches: 70,
      },
      exclude: ['**/node_modules/**', '**/index.ts', '**/*.test.ts'],
    },
  },
});
```

---

## 15. DOCKER SETUP

### docker-compose.yml — Run Everything Locally

```yaml
version: '3.8'

services:

  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - ACCOUNT_SERVICE_URL=http://account-service:3001
      - PAYMENT_SERVICE_URL=http://payment-service:3002
      - UPSTASH_REDIS_URL=${UPSTASH_REDIS_URL}
      - LOG_LEVEL=info
    depends_on:
      account-service:
        condition: service_healthy
      payment-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  account-service:
    build: ./services/account-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - KAFKA_BROKER=${KAFKA_BROKER}
      - KAFKA_USERNAME=${KAFKA_USERNAME}
      - KAFKA_PASSWORD=${KAFKA_PASSWORD}
      - UPSTASH_REDIS_URL=${UPSTASH_REDIS_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  payment-service:
    build: ./services/payment-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - UPSTASH_REDIS_URL=${UPSTASH_REDIS_URL}
      - KAFKA_BROKER=${KAFKA_BROKER}
      - KAFKA_USERNAME=${KAFKA_USERNAME}
      - KAFKA_PASSWORD=${KAFKA_PASSWORD}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  fraud-service:
    build: ./services/fraud-service
    ports:
      - "3003:3003"
    environment:
      - UPSTASH_REDIS_URL=${UPSTASH_REDIS_URL}
      - KAFKA_BROKER=${KAFKA_BROKER}
      - KAFKA_USERNAME=${KAFKA_USERNAME}
      - KAFKA_PASSWORD=${KAFKA_PASSWORD}

  webhook-service:
    build: ./services/webhook-service
    ports:
      - "3004:3004"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - KAFKA_BROKER=${KAFKA_BROKER}
      - KAFKA_USERNAME=${KAFKA_USERNAME}
      - KAFKA_PASSWORD=${KAFKA_PASSWORD}

  notification-service:
    build: ./services/notification-service
    ports:
      - "3005:3005"
    environment:
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM}
      - KAFKA_BROKER=${KAFKA_BROKER}
      - KAFKA_USERNAME=${KAFKA_USERNAME}
      - KAFKA_PASSWORD=${KAFKA_PASSWORD}
```

### Dockerfile Template — Use for Every Service

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

# Never run as root
RUN addgroup --system settlr && adduser --system --ingroup settlr settlr

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

USER settlr

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Test with coverage
        run: npm run test:coverage

      - name: Enforce 70% coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage below 70% — failing CI"
            exit 1
          fi

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: docker-compose build

      - name: Smoke test — services start correctly
        run: |
          cp .env.example .env
          docker-compose up -d
          sleep 15
          curl -f http://localhost:3000/health || exit 1
          curl -f http://localhost:3001/health || exit 1
          curl -f http://localhost:3002/health || exit 1
          docker-compose down
```

---

## 16. WHAT COPILOT MUST NEVER DO

Read this section carefully. If Copilot generates code that violates any of these, reject it and ask for a rewrite.

### Security — Hard Rules
- ❌ NEVER hardcode secrets, API keys, DB URLs, or JWT secrets in source code
- ❌ NEVER log passwords, JWT tokens, or raw credit card numbers
- ❌ NEVER store passwords in plaintext — always bcrypt, salt rounds ≥ 12
- ❌ NEVER skip JWT verification on protected routes
- ❌ NEVER trust user input without Zod validation first
- ❌ NEVER include stack traces in production API responses
- ❌ NEVER skip rate limiting on auth endpoints

### Financial Integrity — Hard Rules
- ❌ NEVER use float, decimal, or JavaScript's number for money arithmetic
- ❌ NEVER use `0.1 + 0.2` style calculations for money
- ❌ NEVER hard delete rows from transactions, ledger_entries, or fraud_signals
- ❌ NEVER modify balance without a Redis lock AND a DB transaction
- ❌ NEVER skip inserting ledger entries for any balance change
- ❌ NEVER publish Kafka events before the DB transaction commits
- ❌ NEVER accept negative amounts or amounts equal to 0

### Code Architecture — Hard Rules
- ❌ NEVER write business logic inside handler files
- ❌ NEVER write SQL/DB queries inside service files
- ❌ NEVER import one service directly into another service (use Kafka)
- ❌ NEVER use `any` type — use `unknown` if the type is truly unknown
- ❌ NEVER use `console.log` — use the shared structured logger
- ❌ NEVER write functions longer than 50 lines
- ❌ NEVER nest if-else deeper than 3 levels
- ❌ NEVER use default exports
- ❌ NEVER use `==` instead of `===`
- ❌ NEVER use `var` — always `const` or `let`

### Common Copilot Mistakes to Watch For

| Copilot Often Suggests | Correct Approach |
|------------------------|-----------------|
| `parseFloat(amount)` for money | `Math.round(parseFloat(amount) * 100)` to get paise |
| `catch (e) { console.error(e) }` | `catch (error) { logger.error('context', { error, traceId }) }` |
| Locking only the sender account | Lock BOTH accounts sorted by UUID |
| `throw new Error('message')` | `throw new AppError('ERROR_CODE', 'message', 400)` |
| Publishing event then DB write | DB write → commit → then publish event |
| Querying DB inside a service file | Create repository function, call from service |
| `parseInt(amount)` in money calcs | Keep amounts as integers throughout, never convert mid-calculation |
| Sequential fraud rule execution | `Promise.all([rule1(), rule2(), rule3(), ...])` |
| Missing `finally` on lock release | Lock release MUST be in `finally` block |
| Returning `null` on error | Return `{ success: false, error: 'CODE' }` |

---

## 17. EXACT COPILOT PROMPTS TO USE

Copy-paste these prompts into Copilot Chat. Start every session by attaching this file.

### Starting a New Service
```
I'm building the [service-name] microservice for Settlr. Read the attached SETTLR_COPILOT.md.

Create the complete folder structure and index.ts for this service following Section 3 (folder structure) and Section 6 (core rules). The service runs on port [PORT]. It connects to [list: database/redis/kafka].

Use named exports, TypeScript strict mode, Express, structured logging, and validate config at startup.
```

### Building the Atomic Transfer
```
Build the initiatePayment function in payment-service/src/services/payment.service.ts.

Follow Section 7 of SETTLR_COPILOT.md exactly — all 17 steps in order. Do not skip any step. Do not reorder steps.

Critical requirements:
- Idempotency check first (Step 1)
- Sort UUIDs before locking (Step 2)
- Locks released in finally block always (Step 14)
- Kafka event published AFTER DB commit only (Step 16)
- Amount is in paise (integer) — never float
```

### Building the Fraud Engine
```
Build the complete fraud engine following Section 8 of SETTLR_COPILOT.md.

Create fraudEngine.ts that runs all 6 rules using Promise.all() (never sequential).
Create each rule in its own file under rules/.

Rules and scores:
1. VELOCITY_CHECK: >3 txns/60s → +25 pts (Redis INCR, 60s TTL)
2. AMOUNT_ANOMALY: >5x avg → +30 pts (Redis sorted set, last 20)
3. UNUSUAL_HOUR: 1am-5am IST → +10 pts
4. NEW_ACCOUNT: <7 days old → +15 pts
5. ROUND_AMOUNT: exact ₹1k/5k/10k/50k → +5 pts
6. RECIPIENT_RISK: >10 senders/hr → +20 pts (Redis INCR, 3600s TTL)

Score 0-29=approve, 30-59=review, 60-79=challenge, 80+=decline
Return FraudResult with score, action, and signals array.
Each null return means rule did not fire.
```

### Building the Webhook Service
```
Build the webhook dispatcher and retry worker following Section 9 of SETTLR_COPILOT.md.

Retry schedule (exact values):
- Retry 1: 30 seconds
- Retry 2: 5 minutes (300s)
- Retry 3: 30 minutes (1800s)
- Retry 4: 2 hours (7200s)
- After retry 4 fails: permanently mark as 'failed'

Every request must:
- Timeout after exactly 5 seconds
- Include X-Settlr-Signature: sha256=HMAC-SHA256(secret, body)
- Include X-Settlr-Event, X-Settlr-Delivery, X-Settlr-Timestamp headers
- Release locks in finally block
```

### Writing Unit Tests
```
Write comprehensive unit tests for [file path] using Vitest.

Follow Section 14 of SETTLR_COPILOT.md:
- Mock ALL external dependencies at the top of the file
- Never use real DB, Redis, or Kafka connections
- Test happy path + ALL error cases: [list specific errors to test]
- Test idempotency behavior (if applicable)
- Use Arrange/Act/Assert pattern with comments
- Test behavior and output — not implementation details
- Aim for 70%+ coverage on this file
```

### Reviewing Generated Code
```
Review this code against the rules in SETTLR_COPILOT.md.

Check for:
1. Any use of float for money amounts (should be integer paise)
2. Business logic in handler files (should only be in services)
3. DB queries in service files (should only be in repositories)
4. Missing error handling (every async operation needs try/catch)
5. Missing structured logging (no console.log)
6. any types used anywhere
7. Lock release not in finally block
8. Kafka events published before DB transaction commits
9. Missing return type annotations
10. Functions longer than 50 lines

List every violation with line numbers and the correct fix.
```

---

## QUICK REFERENCE CARD

```
Money:        Always paise (integer). ₹99.50 = 9950. Never float.
Locking:      Redis lock → DB FOR UPDATE → both together
Lock order:   Sort UUIDs alphabetically. Always lock smaller UUID first.
Idempotency:  Check Redis FIRST. Cache result AFTER commit.
Events:       Publish ONLY after DB transaction commits successfully.
Ledger:       Every transfer = 2 rows (debit sender + credit recipient)
Fraud:        Promise.all() for all 6 rules. Never sequential.
Layers:       Handler → Service → Repository → DB. Never skip layers.
Errors:       AppError class. Never expose stack in responses.
Logs:         logger.info/error always. Never console.log.
Types:        Never use any. Explicit return types on all functions.
Tests:        Mock everything. 70% coverage minimum.
Commits:      feat/fix/refactor(scope): explain WHY not what
```

---

*This file is the single source of truth for the Settlr project. When in doubt, refer back here.*
