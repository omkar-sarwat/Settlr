# Settlr — Distributed Payment Processing Platform

> _"I got curious about how UPI moves money between banks in under 2 seconds. I tried to understand the architecture and built a simplified version from scratch. That curiosity became Settlr."_

---

## What Is Settlr?

Settlr is a production-grade fintech backend that demonstrates mastery of distributed systems, financial data integrity, and real-time event processing. It processes money transfers with:

- **Atomic transactions** — money never duplicates or disappears
- **Distributed locking** — Redis locks + Postgres `SELECT FOR UPDATE` + optimistic versioning (triple safety)
- **Real-time fraud scoring** — 6 rules run in parallel via `Promise.all()` in under 20ms
- **Idempotent API** — network retries never cause double charges
- **Double-entry ledger** — every paisa is always accounted for
- **Stripe-style webhooks** — HMAC-SHA256 signed, exponential backoff retry
- **Event-driven architecture** — Kafka decouples all services

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                    settlr-ui (React)                   │
│            React 18 + Vite + Tailwind + TS            │
└────────────────────────┬──────────────────────────────┘
                         │ HTTP
              ┌──────────▼──────────┐
              │    API Gateway      │
              │    (Port 3000)      │
              │  JWT Auth + Proxy   │
              └──┬───┬───┬───┬─────┘
                 │   │   │   │
    ┌────────────┘   │   │   └────────────┐
    ▼                ▼   ▼                ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Account │  │ Payment  │  │ Webhook  │  │ Notification │
│ Service │  │ Service  │  │ Service  │  │   Service    │
│ (:3001) │  │ (:3002)  │  │ (:3004)  │  │   (:3005)    │
└────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘
     │            │              │               │
     │            ▼              │               │
     │     ┌──────────┐         │               │
     │     │  Fraud   │         │               │
     │     │ Service  │         │               │
     │     │ (:3003)  │         │               │
     │     └──────────┘         │               │
     │            │              │               │
     └──────┬─────┴──────┬──────┘               │
            ▼            ▼                      ▼
     ┌────────────┐ ┌─────────┐          ┌──────────┐
     │ PostgreSQL │ │  Redis  │          │  Kafka   │
     │ (Supabase) │ │(Upstash)│          │(Upstash) │
     └────────────┘ └─────────┘          └──────────┘
```

---

## 🚀 Quick Start

**TL;DR:** `.\start-all.ps1` - See [QUICKSTART.md](QUICKSTART.md) for cheat sheet.

### One-Command Startup

```powershell
# 1. Clone and setup
git clone <repo-url>
cd settlr
Copy-Item .env.example .env
# Edit .env with your database/redis/kafka credentials

# 2. Start EVERYTHING (all 6 services + UI)
.\start-all.ps1
```

This will:
- ✅ Check prerequisites (Node.js, npm)
- 📦 Install all dependencies
- 🗄️ Run database migrations
- 🚀 Start all 6 microservices in separate windows
- 🎨 Start the UI at http://localhost:5173

**Services started:**
- API Gateway: http://localhost:3000
- Account Service: http://localhost:3001
- Payment Service: http://localhost:3002
- Fraud Service: http://localhost:3003
- Webhook Service: http://localhost:3004
- Notification Service: http://localhost:3005
- Settlr UI: http://localhost:5173

### Other Commands

```powershell
# Stop all services
.\stop-all.ps1

# Check service health status
.\check-health.ps1

# Fast restart (skip npm install)
.\start-all.ps1 -SkipInstall

# Daily development (fastest - no install, no migrations)
.\dev-quick.ps1

# Run only database migrations
.\scripts\run-migrations.ps1
```

📖 **Full reference:** [QUICKSTART.md](QUICKSTART.md) | [scripts/README.md](scripts/README.md)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript + Node.js | Type safety is critical for financial code |
| Framework | Express.js | Lightweight, widely known |
| Database | PostgreSQL (Supabase) | ACID transactions for money |
| Cache + Locks | Redis (Upstash) | Sub-ms distributed locking |
| Message Queue | Kafka (Upstash) | Durable event streaming |
| ORM | Knex.js | SQL query builder with transactions |
| Auth | JWT + bcrypt | Stateless auth, secure password hashing |
| Frontend | React 18 + Vite + Tailwind | Modern, fast, type-safe UI |
| State | Zustand + TanStack Query v5 | Minimal boilerplate, server-state caching |
| Testing | Vitest | 3x faster than Jest, native TS |
| CI/CD | GitHub Actions | Industry standard |
| Containers | Docker + Docker Compose | One-command local setup |

**Total monthly cost: ₹0** (all free tiers)

---

## Monorepo Structure

```
settlr/
├── packages/
│   ├── types/          @settlr/types      — Shared TypeScript interfaces + Zod schemas
│   ├── config/         @settlr/config     — Environment variable loading
│   ├── logger/         @settlr/logger     — Structured JSON logging
│   ├── database/       @settlr/database   — Knex.js + PostgreSQL connection
│   ├── redis/          @settlr/redis      — ioredis + distributed locking
│   └── kafka/          @settlr/kafka      — KafkaJS producer/consumer
├── services/
│   ├── api-gateway/    Port 3000          — JWT auth, request proxy
│   ├── account-service/ Port 3001         — Registration, login, accounts
│   ├── payment-service/ Port 3002         — Atomic transfers, idempotency
│   ├── fraud-service/  Port 3003          — 6-rule parallel risk scoring
│   ├── webhook-service/ Port 3004         — Stripe-style delivery + retry
│   └── notification-service/ Port 3005    — Email via Resend.com
├── settlr-ui/          Port 5173          — React dashboard
├── docker-compose.yml
├── DECISIONS.md                           — Technical decisions + rationale
└── README.md                              — This file
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 9+
- Docker (optional, for containerized setup)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/settlr.git
cd settlr

# 2. Install all dependencies (monorepo root)
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase, Upstash Redis, Upstash Kafka, and Resend credentials

# 4. Start all services
npm run dev

# 5. Start the UI (separate terminal)
cd settlr-ui
npm run dev
# → http://localhost:5173
```

### Docker Setup

```bash
# Build and run everything
docker compose up --build

# Services available at:
#   API Gateway:   http://localhost:3000
#   Frontend:      http://localhost:5173
```

---

## API Endpoints

### Auth (Account Service → via API Gateway)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (revoke refresh token) |

### Payments (Payment Service → via API Gateway)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/transfer` | Initiate money transfer |
| GET | `/api/payments/:id` | Get transaction details |
| GET | `/api/payments/history` | Transaction history (paginated) |

### Accounts (Account Service → via API Gateway)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts/me` | Get current user's account |
| GET | `/api/accounts/:id/balance` | Get account balance |

### Webhooks (Webhook Service → via API Gateway)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/endpoints` | Register webhook endpoint |
| GET | `/api/webhooks/endpoints` | List registered endpoints |
| DELETE | `/api/webhooks/endpoints/:id` | Delete webhook endpoint |
| GET | `/api/webhooks/deliveries` | Delivery history (paginated) |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/flagged` | View flagged transactions |
| GET | `/api/admin/stats` | System statistics |

---

## The 17-Step Atomic Transfer

Every money transfer follows this exact sequence:

1. **Validate input** — Zod schema validation
2. **Check idempotency** — Redis lookup for duplicate request
3. **Validate amount** — min 100 paise, max ₹1,00,000
4. **Validate accounts** — sender ≠ recipient
5. **Acquire Redis locks** — sorted by account ID to prevent deadlocks
6. **Call fraud engine** — 6 parallel rules, score → action
7. **If declined** → publish `payment.fraud_blocked`, throw
8. **Begin DB transaction** — `db.transaction(async trx => { ... })`
9. **Lock sender row** — `SELECT * FROM accounts WHERE id = ? FOR UPDATE`
10. **Lock recipient row** — `SELECT * FROM accounts WHERE id = ? FOR UPDATE`
11. **Check balance** — sender.balance ≥ amount
12. **Debit sender** — `UPDATE accounts SET balance = balance - amount WHERE version = ?`
13. **Credit recipient** — `UPDATE accounts SET balance = balance + amount`
14. **Create transaction record** — status: completed
15. **Create ledger entries** — 2 entries (DEBIT + CREDIT) with before/after balances
16. **Commit transaction** — atomic
17. **Post-commit** — cache idempotency key, publish `payment.completed`, release locks

---

## Testing

```bash
# Run all tests
npm test

# Run tests for a specific service
cd services/payment-service
npx vitest run

# Run with coverage
npx vitest run --coverage
```

**Coverage requirements:** 70% minimum for lines, functions, and branches (enforced in CI).

---

## Key Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| Distributed Locking | payment-service (Redis) | Prevent double-spend on concurrent transfers |
| Optimistic Concurrency | accounts table (version column) | Detect conflicting writes |
| Idempotency Keys | payment-service (Redis) | Prevent duplicate charges on retry |
| Double-Entry Ledger | ledger_entries table | Every paisa accounted for |
| Event Sourcing (lite) | Kafka topics | Services communicate via events, not direct calls |
| CQRS (lite) | fraud-service | Read model (Redis) separate from write model (Postgres) |
| HMAC Signing | webhook-service | Merchants verify webhook authenticity |
| Exponential Backoff | webhook retry | Graceful retry without overwhelming endpoints |
| Circuit Breaker (pattern) | fraud check timeout | Degrade gracefully if fraud service is slow |

---

## Environment Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://...

# Redis (Upstash)
REDIS_URL=rediss://...

# Kafka (Upstash)
KAFKA_BROKERS=...
KAFKA_USERNAME=...
KAFKA_PASSWORD=...

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Fraud thresholds
FRAUD_THRESHOLD_APPROVE=30
FRAUD_THRESHOLD_REVIEW=60
FRAUD_THRESHOLD_CHALLENGE=80

# Webhook settings
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_ATTEMPTS=5
WEBHOOK_RETRY_DELAYS=30,300,1800,7200

# Email (Resend)
RESEND_API_KEY=re_...

# Service URLs (internal)
FRAUD_SERVICE_URL=http://localhost:3003
```

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint + Type Check** — `tsc --noEmit` across all packages
2. **Test** — Matrix strategy runs Vitest for each service in parallel
3. **Coverage** — 70% minimum enforced via coverage threshold
4. **Docker Build** — `docker compose build` + smoke test (container starts and `/health` returns 200)

---

## License

MIT

---

Built with curiosity about how UPI actually works.
