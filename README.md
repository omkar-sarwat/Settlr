<div align="center">
  <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr_logo_final_clean.svg" alt="Settlr Logo" width="200" />

  <p><strong>A Production-Grade Distributed Payment Processing Platform</strong></p>

  <p><em>"I got curious about how UPI moves money between banks in under 2 seconds.<br/>I tried to understand the architecture and built a simplified version from scratch. That curiosity became Settlr."</em></p>

  <br/>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-89.8%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
    <img src="https://img.shields.io/badge/Kafka-Upstash-231F20?style=for-the-badge&logo=apachekafka&logoColor=white" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
    <img src="https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge" />
  </p>

  <br/>

  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-api-reference">API Reference</a> •
    <a href="#-key-design-patterns">Design Patterns</a> •
    <a href="#-tech-stack">Tech Stack</a>
  </p>
</div>

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr-ui/public/home%20page%20.png" alt="Settlr Home Dashboard" width="100%" />
      <br/>
      <sub><b>🏠 Home Dashboard</b> — Live balance, quick transfer, recent activity</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr-ui/public/login.png" alt="Settlr Login" width="100%" />
      <br/>
      <sub><b>🔐 Authentication</b> — Secure JWT-based login & registration</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr-ui/public/transaction%20history%20.png" alt="Transaction History" width="100%" />
      <br/>
      <sub><b>📋 Transaction History</b> — Paginated history with status indicators</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr-ui/public/fraud%20panel.png" alt="Fraud Detection Panel" width="100%" />
      <br/>
      <sub><b>🛡️ Fraud Panel</b> — Real-time fraud scoring & admin view of flagged transactions</sub>
    </td>
  </tr>
</table>

---

## 📖 Table of Contents

- [What Is Settlr?](#-what-is-settlr)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Monorepo Structure](#-monorepo-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [The 17-Step Atomic Transfer](#-the-17-step-atomic-transfer)
- [Key Design Patterns](#-key-design-patterns)
- [Testing](#-testing)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Scripts Reference](#-scripts-reference)
- [Documentation Index](#-documentation-index)
- [Contributing](#-contributing)
- [License](#-license)

---

## 💡 What Is Settlr?

Settlr is a **production-grade fintech backend** that demonstrates mastery of distributed systems, financial data integrity, and real-time event processing. Built to understand how systems like **UPI** process millions of transactions reliably, Settlr implements the same fundamental guarantees under the hood.

| Guarantee | Implementation |
|-----------|----------------|
| 💰 Money never duplicates or disappears | Atomic DB transactions + double-entry ledger |
| 🔒 Concurrent transfers are safe | Redis locks + `SELECT FOR UPDATE` + optimistic versioning (triple safety) |
| 🛡️ Real-time fraud detection | 6 rules running in parallel via `Promise.all()` in < 20ms |
| 🔁 Network retries never cause double charges | Idempotency keys backed by Redis |
| 📒 Full auditability | Double-entry ledger — every paisa always accounted for |
| 🔔 Reliable event delivery | HMAC-SHA256 signed webhooks with exponential backoff retry |
| ⚡ Decoupled services | Event-driven architecture via Kafka |

> 💸 **Total monthly infrastructure cost: ₹0** — Supabase, Upstash Redis, Upstash Kafka, and Resend all run on free tiers.

---

## ✨ Key Features

### 🏦 Core Payment Engine
- **Atomic Money Transfers** — Funds debit and credit happen in a single PostgreSQL transaction. Partial states are impossible.
- **Double-Entry Ledger** — Two ledger entries (DEBIT + CREDIT) are created for every transfer, capturing before/after balances for full auditability.
- **Idempotent API** — Clients can safely retry failed requests. Duplicate charges are prevented via Redis-backed idempotency keys with TTL.

### 🔐 Security & Fraud Prevention
- **Real-Time Fraud Scoring** — 6 detection rules run in parallel via `Promise.all()` on every transaction in < 20ms.
- **Triple-Layer Concurrency Protection** — Redis distributed locks + Postgres `SELECT FOR UPDATE` row locking + optimistic versioning on the `accounts` table.
- **JWT Authentication** — Stateless access tokens (15m TTL) with secure refresh tokens (7d TTL).
- **HMAC-SHA256 Webhooks** — Every webhook payload is signed so downstream merchants can verify authenticity.

### 📡 Event-Driven Architecture
- **Kafka Integration** — All services communicate asynchronously via Upstash Kafka topics. No direct service-to-service HTTP calls for core flows.
- **Stripe-Style Webhooks** — Configurable delivery endpoints, exponential backoff retry (up to 5 attempts at 30s / 5m / 30m / 2h intervals), full delivery history.
- **Email Notifications** — Transaction confirmations delivered via Resend.com.

### 🖥️ React Dashboard (`settlr-ui`)
- Live balance display with real-time updates
- Transfer UI — send money between accounts directly from the browser
- Paginated transaction history with status indicators
- Webhook management — register and monitor delivery endpoints
- Admin fraud panel — review flagged transactions and system statistics

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     settlr-ui  (React)                        │
│            React 18 + Vite + Tailwind + TypeScript           │
│                    http://localhost:5173                      │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP / REST
                  ┌──────────▼──────────┐
                  │     API Gateway      │
                  │     (Port 3000)      │
                  │  JWT Auth + Proxy    │
                  └──┬────┬────┬────┬───┘
                     │    │    │    │
          ┌──────────┘    │    │    └──────────┐
          ▼               ▼    ▼               ▼
   ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │   Account   │  │ Payment  │  │ Webhook  │  │ Notification │
   │   Service   │  │ Service  │  │ Service  │  │   Service    │
   │   (:3001)   │  │ (:3002)  │  │ (:3004)  │  │   (:3005)    │
   └─────────────┘  └────┬─────┘  └──────────┘  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │    Fraud     │
                  │   Service    │
                  │   (:3003)    │
                  └──────────────┘
                         │
          ┌──────────────┼───────────────┐
          ▼              ▼               ▼
   ┌────────────┐  ┌──────────┐   ┌──────────┐
   │ PostgreSQL │  │  Redis   │   │  Kafka   │
   │ (Supabase) │  │(Upstash) │   │(Upstash) │
   └────────────┘  └──────────┘   └──────────┘
```

### Service Breakdown

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 3000 | JWT validation, request routing, rate limiting |
| **Account Service** | 3001 | User registration, login, account management |
| **Payment Service** | 3002 | Atomic transfers, idempotency, ledger entries |
| **Fraud Service** | 3003 | Parallel 6-rule risk scoring engine |
| **Webhook Service** | 3004 | Stripe-style delivery with exponential backoff retry |
| **Notification Service** | 3005 | Email notifications via Resend.com |
| **settlr-ui** | 5173 | React 18 dashboard |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript + Node.js | Type safety is critical in financial code |
| Framework | Express.js | Lightweight, widely understood |
| Database | PostgreSQL (Supabase) | ACID transactions guarantee data integrity |
| Cache & Locks | Redis (Upstash) | Sub-millisecond distributed locking |
| Message Queue | Kafka (Upstash) | Durable, ordered event streaming |
| Query Builder | Knex.js | Raw SQL power with full transaction support |
| Auth | JWT + bcrypt | Stateless tokens, secure password hashing |
| Frontend | React 18 + Vite + Tailwind CSS | Modern, fast, fully typed UI |
| State Management | Zustand + TanStack Query v5 | Minimal boilerplate, server-state caching |
| Testing | Vitest | 3× faster than Jest, native TypeScript support |
| Load Testing | k6 | Realistic latency benchmarking |
| CI/CD | GitHub Actions | Matrix test strategy, industry standard |
| Containers | Docker + Docker Compose | One-command reproducible environment |

---

## 📁 Monorepo Structure

```
Settlr/
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions pipeline
│
├── packages/                       # Shared internal libraries
│   ├── types/        @settlr/types      Shared TypeScript interfaces + Zod schemas
│   ├── config/       @settlr/config     Environment variable loading
│   ├── logger/       @settlr/logger     Structured JSON logging (pino)
│   ├── database/     @settlr/database   Knex.js + PostgreSQL connection
│   ├── redis/        @settlr/redis      ioredis + distributed locking utilities
│   └── kafka/        @settlr/kafka      KafkaJS producer/consumer helpers
│
├── services/
│   ├── api-gateway/                Port 3000 — JWT auth, request proxy
│   ├── account-service/            Port 3001 — User accounts, auth
│   ├── payment-service/            Port 3002 — Atomic transfers, ledger
│   ├── fraud-service/              Port 3003 — Parallel risk scoring
│   ├── webhook-service/            Port 3004 — Delivery + retry engine
│   └── notification-service/       Port 3005 — Email via Resend.com
│
├── settlr-ui/                      Port 5173 — React 18 dashboard
│   ├── public/
│   │   ├── home page .png          # Dashboard screenshot
│   │   ├── login.png               # Login page screenshot
│   │   ├── transaction history .png
│   │   ├── fraud panel.png
│   │   └── settlr_logo.svg
│   └── src/
│
├── k6/                             Load testing scripts
├── scripts/                        PowerShell automation
├── design-system/                  Design tokens + guidelines
├── tests/real-integration/         Integration tests against live services
├── types/                          Root-level shared type definitions
│
├── docker-compose.yml
├── .env.example                    ← Copy this to .env
├── package.json                    Monorepo root (npm workspaces)
└── tsconfig.base.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** and **npm 9+**
- [Supabase](https://supabase.com) project (free tier works)
- [Upstash Redis](https://upstash.com) database (free tier)
- [Upstash Kafka](https://upstash.com/kafka) cluster (free tier)
- [Resend](https://resend.com) API key for email (optional, free tier)

---

### Option A — One-Command PowerShell *(Recommended for Windows)*

```powershell
# 1. Clone and configure
git clone https://github.com/omkar-sarwat/Settlr.git
cd Settlr
Copy-Item .env.example .env
# Open .env and fill in your credentials

# 2. Start EVERYTHING
.\start-all.ps1
```

This script automatically:
- ✅ Checks Node.js and npm prerequisites
- 📦 Installs all monorepo dependencies
- 🗄️ Runs database migrations
- 🚀 Opens 6 microservices in separate terminal windows
- 🎨 Starts the UI at **http://localhost:5173**

---

### Option B — Docker Compose

```bash
# Build and start all services
docker compose up --build

# Stop everything
docker compose down
```

---

### Option C — Manual Setup

```bash
# 1. Clone
git clone https://github.com/omkar-sarwat/Settlr.git
cd Settlr

# 2. Install all workspace dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase / Upstash / Resend credentials

# 4. Run database migrations
node scripts/run-migrations.js

# 5. Start each service in a separate terminal
cd services/api-gateway          && npm run dev   # :3000
cd services/account-service      && npm run dev   # :3001
cd services/payment-service      && npm run dev   # :3002
cd services/fraud-service        && npm run dev   # :3003
cd services/webhook-service      && npm run dev   # :3004
cd services/notification-service && npm run dev   # :3005

# 6. Start the UI
cd settlr-ui && npm run dev
# → http://localhost:5173
```

---

## ⚙️ Environment Variables

Copy `.env.example` → `.env` and fill in the values:

```env
# ── Database (Supabase) ─────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# ── Cache & Locks (Upstash Redis) ──────────────────────────────
REDIS_URL=rediss://:[password]@[host]:6380

# ── Event Streaming (Upstash Kafka) ────────────────────────────
KAFKA_BROKERS=your-broker.upstash.io:9092
KAFKA_USERNAME=your-username
KAFKA_PASSWORD=your-password

# ── Authentication ──────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-minimum-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# ── Fraud Detection Thresholds ─────────────────────────────────
FRAUD_THRESHOLD_APPROVE=30        # Score below → auto-approve
FRAUD_THRESHOLD_REVIEW=60         # Score below → flag for review
FRAUD_THRESHOLD_CHALLENGE=80      # Score above → block transaction

# ── Webhook Delivery ───────────────────────────────────────────
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_ATTEMPTS=5
WEBHOOK_RETRY_DELAYS=30,300,1800,7200   # 30s → 5m → 30m → 2h

# ── Email Notifications (Resend) ───────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# ── Internal Service URLs ──────────────────────────────────────
FRAUD_SERVICE_URL=http://localhost:3003
ACCOUNT_SERVICE_URL=http://localhost:3001
PAYMENT_SERVICE_URL=http://localhost:3002
```

---

## 📡 API Reference

All requests route through the **API Gateway** at `http://localhost:3000`.
Protected routes require `Authorization: Bearer <access_token>`.

### 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/register` | ❌ | Create a new user account |
| `POST` | `/api/auth/login` | ❌ | Login and receive access + refresh tokens |
| `POST` | `/api/auth/refresh` | ❌ | Exchange refresh token for new access token |
| `POST` | `/api/auth/logout` | ✅ | Revoke the current refresh token |

```json
// POST /api/auth/register
{
  "name": "Omkar Sarwat",
  "email": "omkar@example.com",
  "password": "secure-password-123"
}
```

### 💳 Accounts

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/accounts/me` | ✅ | Get current user's account |
| `GET` | `/api/accounts/:id/balance` | ✅ | Get account balance |

### 💸 Payments

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/payments/transfer` | ✅ | Initiate an atomic money transfer |
| `GET` | `/api/payments/:id` | ✅ | Get transaction by ID |
| `GET` | `/api/payments/history` | ✅ | Paginated transaction history |

```json
// POST /api/payments/transfer
{
  "toAccountId": "acc_xyz123",
  "amount": 50000,
  "idempotencyKey": "unique-client-generated-key",
  "note": "Splitting dinner"
}
// amount is in paise — 50000 paise = ₹500.00
```

### 🔔 Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/webhooks/endpoints` | ✅ | Register a webhook endpoint |
| `GET` | `/api/webhooks/endpoints` | ✅ | List all registered endpoints |
| `DELETE` | `/api/webhooks/endpoints/:id` | ✅ | Remove a webhook endpoint |
| `GET` | `/api/webhooks/deliveries` | ✅ | Paginated delivery history |

### 🛡️ Admin

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/admin/flagged` | ✅ Admin | View fraud-flagged transactions |
| `GET` | `/api/admin/stats` | ✅ Admin | System-wide statistics |

### Kafka Events

| Topic | Published When |
|-------|----------------|
| `payment.completed` | Transfer succeeded |
| `payment.fraud_blocked` | Fraud engine blocked the transfer |
| `payment.fraud_flagged` | Transfer flagged for manual review |
| `account.created` | New user registered |

---

## 🔄 The 17-Step Atomic Transfer

Every money transfer follows this exact sequence — no shortcuts, no partial states:

```
  1  ─── Validate input                   Zod schema validation
  2  ─── Check idempotency key            Redis lookup for duplicate request
  3  ─── Validate amount                  Min 100 paise / Max ₹1,00,000
  4  ─── Validate accounts                Sender ≠ recipient, both exist & active
  5  ─── Acquire Redis locks              Sorted by account ID → prevents deadlocks
  6  ─── Run fraud engine                 6 rules in parallel via Promise.all()
  7  ─── [If DECLINED]                    Publish payment.fraud_blocked → throw
  8  ─── Begin DB transaction             db.transaction(async trx => { ... })
  9  ─── Lock sender row                  SELECT * FROM accounts WHERE id=? FOR UPDATE
 10  ─── Lock recipient row               SELECT * FROM accounts WHERE id=? FOR UPDATE
 11  ─── Check balance                    sender.balance >= amount
 12  ─── Debit sender                     UPDATE accounts SET balance = balance - amount
                                          WHERE version = ?   (optimistic lock)
 13  ─── Credit recipient                 UPDATE accounts SET balance = balance + amount
 14  ─── Create transaction record        status: completed
 15  ─── Create ledger entries            2 rows: DEBIT + CREDIT with before/after balances
 16  ─── Commit DB transaction            Atomic — either all or nothing
 17  ─── Post-commit                      Cache idempotency key in Redis
                                          Publish payment.completed to Kafka
                                          Release Redis locks
```

> If **any step fails**, the entire transaction rolls back automatically. Money is never in a partial state.

---

## 🎯 Key Design Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Distributed Locking** | `payment-service` (Redis) | Prevent double-spend on concurrent transfers to/from the same accounts |
| **Optimistic Concurrency** | `accounts.version` column | Detect conflicting writes that sneak past row-level locks |
| **Idempotency Keys** | `payment-service` (Redis TTL) | Ensure retried requests never create duplicate charges |
| **Double-Entry Ledger** | `ledger_entries` table | Every paisa is always accounted for; supports complete audit trail |
| **Event Sourcing (lite)** | Kafka topics | Services react to events, not polling or direct HTTP calls |
| **CQRS (lite)** | `fraud-service` | Redis velocity counters (read model) separate from Postgres (write model) |
| **HMAC Signing** | `webhook-service` | Downstream merchants verify webhook authenticity |
| **Exponential Backoff** | Webhook retry queue | Graceful retry at 30s → 5m → 30m → 2h |
| **Circuit Breaker** | Fraud check timeout | Degrade gracefully when fraud service is slow |
| **Sorted Lock Acquisition** | `payment-service` | Always lock account IDs in ascending order to eliminate deadlocks |

---

## 🧪 Testing

```bash
# Run all tests across the monorepo
npm test

# Run tests for a specific service
cd services/payment-service
npx vitest run

# Generate coverage report
npx vitest run --coverage

# Run real integration tests (requires live services)
npx vitest run --config vitest.real.config.ts

# Load test with k6
k6 run k6/transfer-load-test.js
```

**CI enforces these minimums:**

| Metric | Threshold |
|--------|-----------|
| Line coverage | 70% |
| Function coverage | 70% |
| Branch coverage | 70% |

See [`METRICS.md`](./METRICS.md) and [`REAL_LATENCY_REPORT.md`](./REAL_LATENCY_REPORT.md) for real-world k6 benchmarks.

---

## 🔧 CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request:

```
Push / PR
   │
   ├── 1. Lint + Type Check ──── tsc --noEmit across all packages
   │
   ├── 2. Test (Matrix) ─────── Vitest runs for each service in parallel
   │
   ├── 3. Coverage Gate ──────── Fails if any service drops below 70%
   │
   └── 4. Docker Smoke Test ──── docker compose build → /health returns 200
```

---

## 📜 Scripts Reference

| Script | Description |
|--------|-------------|
| `.\start-all.ps1` | Start all services + UI (installs deps + runs migrations) |
| `.\start-all.ps1 -SkipInstall` | Restart without reinstalling dependencies |
| `.\stop-all.ps1` | Stop all running services |
| `.\check-health.ps1` | Check health endpoint of every service |
| `.\dev-quick.ps1` | Fastest daily restart (no install, no migrations) |
| `.\scripts\run-migrations.ps1` | Run database migrations only |

> 📖 Full cheat sheet: [`QUICKSTART.md`](./QUICKSTART.md)

---

## 📚 Documentation Index

| Document | Contents |
|----------|---------|
| [`QUICKSTART.md`](./QUICKSTART.md) | Getting started cheat sheet |
| [`DECISIONS.md`](./DECISIONS.md) | Architecture decisions and rationale |
| [`DESIGN_SYSTEM_APPLIED.md`](./DESIGN_SYSTEM_APPLIED.md) | UI design tokens and component guidelines |
| [`METRICS.md`](./METRICS.md) | Performance benchmarks and targets |
| [`REAL_LATENCY_REPORT.md`](./REAL_LATENCY_REPORT.md) | Real-world k6 latency measurements |
| [`SETTLR_COPILOT.md`](./SETTLR_COPILOT.md) | GitHub Copilot prompt guidelines |
| [`tests.md`](./tests.md) | Testing strategy and test case docs |

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch — `git checkout -b feat/your-feature`
3. Make your changes and ensure tests pass — `npm test`
4. Confirm TypeScript compiles cleanly — `tsc --noEmit`
5. Open a pull request with a clear description

Please read [`DECISIONS.md`](./DECISIONS.md) before making architectural changes to understand the reasoning behind existing design choices.

---

## 📄 License

MIT © [Omkar Sarwat](https://github.com/omkar-sarwat)

---

<div align="center">
  <img src="https://raw.githubusercontent.com/omkar-sarwat/Settlr/main/settlr-ui/public/settlr_logo.svg" width="60" alt="Settlr" />

  <p>Built with curiosity about how UPI actually works.</p>

  <p>
    <a href="https://github.com/omkar-sarwat/Settlr/issues">🐛 Report Bug</a> &nbsp;·&nbsp;
    <a href="https://github.com/omkar-sarwat/Settlr/issues">✨ Request Feature</a> &nbsp;·&nbsp;
    <a href="https://github.com/omkar-sarwat/Settlr/blob/main/DECISIONS.md">🏛️ Architecture Decisions</a>
  </p>

  <br/>
  <sub>If this helped you learn something, consider giving it a ⭐</sub>
</div>
