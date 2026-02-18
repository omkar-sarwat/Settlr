# DECISIONS.md — Technical Decision Log

> Every major architectural and technology choice is documented here with rationale. This is written for recruiters and interviewers to understand the **WHY** behind every decision.

---

## 1. Why Microservices Instead of a Monolith?

**Decision:** Split into 6 independently deployable services (api-gateway, account-service, payment-service, fraud-service, webhook-service, notification-service).

**Why:**
- **Real-world relevance:** UPI, Stripe, and Razorpay all use service-oriented architecture. A monolith would not demonstrate understanding of distributed systems.
- **Fault isolation:** If the fraud engine crashes, money transfers queue up via Kafka instead of failing entirely. Payments and notifications are fully decoupled.
- **Independent scaling:** Payment-service handles 10x more traffic than webhook-service during peak hours — horizontal scaling per-service is practical.
- **Team parallelism:** In a real team, different engineers can own different services without merge conflicts.

**Trade-off accepted:** Increased operational complexity (Docker Compose, service discovery, distributed tracing). For a portfolio project, this trade-off demonstrates production awareness.

---

## 2. Why PostgreSQL (via Supabase) for Database?

**Decision:** PostgreSQL as the single source of truth for all transactional data.

**Why:**
- **ACID transactions are non-negotiable for money.** Every transfer debits one account and credits another inside a single database transaction. If either operation fails, both are rolled back. MongoDB cannot guarantee this across documents in a collection.
- **`SELECT ... FOR UPDATE` row-level locking** prevents phantom reads during concurrent balance checks. Two simultaneous transfers from the same account cannot both read the same balance.
- **Version column (optimistic locking)** provides a second layer of protection: `UPDATE accounts SET balance = X WHERE id = ? AND version = ?` returns 0 rows affected if another transaction already modified the row.
- **Supabase free tier** provides 500MB PostgreSQL with connection pooling — enough for a portfolio project with zero cost.

**Alternatives considered:**
- MongoDB: No multi-document ACID transactions (before v4.0) and even now they're slower and less battle-tested for financial workloads.
- MySQL: Would also work, but PostgreSQL's `FOR UPDATE` semantics, jsonb columns, and ecosystem are stronger.

---

## 3. Why Paise (Integers) Instead of Float/Decimal?

**Decision:** All monetary amounts are stored and transmitted as integers representing paise (1/100 of ₹1).

**Why:**
- `0.1 + 0.2 === 0.30000000000000004` in JavaScript. This is IEEE 754 floating-point arithmetic. In financial code, this causes real money loss over millions of transactions.
- Integers are exact. ₹500.50 is stored as `50050` paise. All arithmetic is on integers.
- Stripe, Razorpay, and every payment processor in production uses this pattern (Stripe uses cents, Razorpay uses paise).
- Zod validation enforces `z.number().int().positive()` on all API inputs.

---

## 4. Why Redis for Distributed Locks?

**Decision:** Use Redis `SET key NX PX ttl` for distributed account locks before every transfer.

**Why:**
- **Problem:** Two concurrent transfers from the same account could both read balance=₹1000 and both approve ₹800 transfers, resulting in -₹600 balance.
- **Solution:** Before starting a transaction, acquire Redis locks on both the sender and recipient accounts (sorted by ID to prevent deadlocks). If lock acquisition fails, return `409 Account Busy`.
- **Why Redis over Postgres advisory locks?** Redis locks are faster (sub-ms), automatically expire via TTL (prevents stale locks on crash), and work across multiple service instances.
- **Lock TTL:** 10 seconds — enough for the transaction to complete, short enough that a crashed service doesn't hold locks forever.

**Belt-and-suspenders approach:** Redis lock + Postgres `SELECT FOR UPDATE` + optimistic versioning. Three layers because money is unforgiving.

---

## 5. Why Kafka for Event Streaming?

**Decision:** Kafka (via Upstash Serverless Kafka) as the event bus between services.

**Why:**
- **Decoupling:** Payment-service publishes `payment.completed` but doesn't know or care who consumes it. Webhook-service, notification-service, and any future analytics service can consume independently.
- **Durability:** If notification-service is down when a payment completes, the event is retained in Kafka. When it comes back up, it processes the backlog. No events are lost.
- **Ordering:** Kafka guarantees ordering within a partition. Keying by `accountId` ensures all events for one account are processed in order.
- **Industry standard:** Every fintech company at scale uses Kafka or a Kafka-compatible system.

**Topics defined:**
- `payment.completed` — successful transfer
- `payment.failed` — failed transfer (insufficient balance, etc.)
- `payment.fraud_blocked` — declined by fraud engine
- `webhook.delivery.failed` — webhook permanently failed after all retries

---

## 6. Why a Custom Fraud Engine Instead of Using a Third-Party API?

**Decision:** Build a scoring engine with 6 rules that run in parallel via `Promise.all()`.

**Why:**
- **Interview value:** "I built a fraud engine that scores 6 signals in parallel in under 20ms" is a far stronger statement than "I called a third-party API."
- **Parallel execution:** All 6 rules run simultaneously — total latency = slowest single rule, not the sum of all. This is O(max) not O(sum). Demonstrated via `Promise.all()`.
- **Configurable thresholds:** Score → action mapping is driven by environment variables, not hardcoded. `approve < 30`, `review < 60`, `challenge < 80`, `decline >= 80`.
- **Real patterns detected:**
  - Velocity (>3 txns in 60s): +25 pts
  - Amount anomaly (>5x average): +30 pts
  - Unusual hour (1-5am IST): +10 pts
  - New account (<7 days): +15 pts
  - Round amount (₹1000, ₹5000, etc.): +5 pts
  - Recipient risk (>10 unique senders/hour — money mule): +20 pts

---

## 7. Why Double-Entry Ledger?

**Decision:** Every transfer creates exactly 2 ledger entries: one DEBIT, one CREDIT. Both inside the same database transaction.

**Why:**
- **Accounting integrity:** The sum of all DEBIT entries system-wide must always equal the sum of all CREDIT entries. If they don't, money was created or destroyed — a critical bug.
- **Audit trail:** Every entry records `balance_before` and `balance_after`. This makes debugging balance discrepancies trivial: walk the ledger forward from account creation.
- **Regulatory requirement:** Real payment companies are legally required to maintain double-entry books. Building this habit now is forward-looking.
- **Reconciliation:** A background job can verify `SUM(debits) = SUM(credits)` periodically and alert on mismatch.

---

## 8. Why Idempotency Keys?

**Decision:** Every payment API call requires an `Idempotency-Key` header. Duplicate keys return the cached result without executing again.

**Why:**
- **Network retries:** Mobile networks are unreliable. If a client sends a payment request and the response times out, it will retry. Without idempotency, the user gets charged twice.
- **Implementation:** Redis cache with 24-hour TTL. On each request: check Redis first → if found, return cached response → if not, process and cache the result.
- **Stripe compatibility:** This is exactly how Stripe's idempotency works. Using the same pattern demonstrates industry awareness.

---

## 9. Why Webhook Delivery with Exponential Backoff?

**Decision:** Webhooks use exponential retry delays: 30s → 5min → 30min → 2hr. After 5 attempts, mark as permanently failed.

**Why:**
- **Reliability:** Merchant servers go down temporarily. Retrying with backoff gives them time to recover without overwhelming them.
- **Stripe-identical pattern:** Stripe uses the exact same retry schedule. Building this demonstrates understanding of webhook delivery guarantees.
- **HMAC-SHA256 signatures:** Every webhook includes `X-Settlr-Signature: sha256=<digest>`. Merchants verify the signature to ensure the payload came from Settlr and wasn't tampered with.
- **Failure notification:** When all retries are exhausted, a Kafka event (`webhook.delivery.failed`) triggers notification-service to alert the merchant.

---

## 10. Why Vitest Instead of Jest?

**Decision:** Vitest for all testing (unit + integration).

**Why:**
- **Speed:** Vitest runs tests ~3x faster than Jest due to native ESM support and Vite's module resolution.
- **TypeScript first-class:** No need for `ts-jest` transformer. Vitest understands TypeScript natively.
- **Compatible API:** `describe`, `it`, `expect`, `vi.mock()` — same API as Jest, so skills transfer.
- **v8 coverage:** Built-in coverage via v8 engine, no external dependency required.
- **Minimum 70% coverage enforced** in CI for lines, functions, and branches.

---

## 11. Why JWT for Authentication?

**Decision:** Stateless JWT access tokens (15min) + Redis-stored refresh tokens (7 days).

**Why:**
- **Stateless verification:** API Gateway can verify tokens without hitting the database on every request. Just verify the JWT signature.
- **Refresh token in Redis:** Enables instant logout — delete the Redis key and the refresh token is immediately invalid.
- **Short access token TTL (15min):** Limits damage if an access token is stolen. Client must refresh frequently.
- **bcrypt with salt rounds ≥ 12:** Standard for password hashing. Slow enough to resist brute force, fast enough for user login.

---

## 12. Why Docker Multi-Stage Builds?

**Decision:** Every service Dockerfile uses `FROM node:20-alpine AS builder` → `FROM node:20-alpine AS runner`.

**Why:**
- **Image size:** Builder stage installs all `devDependencies` for compilation. Runner stage copies only production artifacts. Result: ~150MB image instead of ~800MB.
- **Security:** Runner image does not contain `npm`, `gcc`, development tools, or source code. Smaller attack surface.
- **Non-root user:** `USER settlr` — never run as root in production.
- **Health checks:** `HEALTHCHECK CMD wget --spider http://localhost:PORT/health` — Docker knows when a service is unhealthy.

---

## 13. Why React + Vite for the Frontend?

**Decision:** React 18 with Vite 6, TypeScript, Tailwind CSS.

**Why:**
- **Vite:** Sub-second HMR, instant server start, native ESM. Create-React-App is deprecated.
- **Tailwind CSS:** Utility-first CSS — no CSS files to manage, consistent design system, tree-shakes unused styles.
- **Zustand:** Simpler than Redux, no boilerplate. Perfect for auth state management.
- **TanStack Query v5:** Server state management with caching, background refetching, and loading/error states. Replaces hand-written `useEffect` + `useState` data fetching.
- **React Hook Form + Zod:** Type-safe form validation with zero re-renders. Schema shared between frontend and backend.
- **Recharts:** Lightweight charting for the dashboard. D3 is overkill for 4 charts.
- **Lucide React:** Modern icon set, tree-shakeable, consistent style.

---

## 14. Why Monorepo with npm Workspaces?

**Decision:** Single repository with `packages/*` for shared code and `services/*` for microservices.

**Why:**
- **Code sharing:** `@settlr/types`, `@settlr/config`, `@settlr/logger`, `@settlr/database`, `@settlr/redis`, `@settlr/kafka` are shared across all services. Without a monorepo, these would need to be published to npm.
- **Atomic changes:** A type change in `@settlr/types` and the service code that uses it can be in the same commit. No version mismatch.
- **Single CI:** One `npm ci` at root installs everything. One GitHub Actions workflow tests all services.
- **npm workspaces over Turborepo/Nx:** Simpler, fewer dependencies, sufficient for 6 services. We don't need incremental builds yet.

---

## 15. Why Structured JSON Logging?

**Decision:** All logs are JSON objects via a custom `@settlr/logger` package (wrapping console or pino).

**Why:**
- **Machine-parseable:** Grafana, ELK, and CloudWatch can index JSON logs. Plain text requires regex parsing.
- **Trace correlation:** Every log includes `traceId`. A single API request can be traced across all services by filtering on its trace ID.
- **Standard fields:** `{ level, timestamp, service, traceId, message, ...extra }`. Consistent across all services.
- **No `console.log` in production code.** Only `logger.info()`, `logger.warn()`, `logger.error()`.
