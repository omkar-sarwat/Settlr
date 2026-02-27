<!--- This README is intended as a comprehensive, production-quality project overview for engineers and reviewers. --->

<!-- Logo -->
![Settlr logo](settlr_logo.svg)

# Settlr — Distributed Payment Processing Platform

One-line: A production-oriented microservices reference implementation demonstrating safe, atomic money transfers, resilient event-driven design, and end-to-end observability.

This document is written for engineers, architects, and technical reviewers who will run, extend, or audit Settlr. It provides a clear overview of design decisions, architecture, development and deployment workflows, and how to operate the system locally.

---

## Table of contents
- Project summary
- Key features & guarantees
- Architecture & components
- Getting started (local development)
- Configuration & environment variables
- Service APIs & contract summary
- Data model and important tables
- Observability & troubleshooting
- Testing strategy
- CI/CD and release process
- Security considerations
- Contributing guide
- License

---

## Project summary

Settlr is a fully-typed, Node.js + TypeScript microservices reference platform focused on financial correctness and distributed-systems best practices. The project demonstrates:

- Atomic transfers with strong correctness guarantees
- Distributed locking patterns to avoid double-spend
- Event-driven decoupling using Kafka
- Secure, idempotent APIs with strict input validation
- Lightweight, modern frontend built with React + Vite

It is designed as a learning and evaluation platform for production-grade fintech patterns.

---

## Key features & guarantees

- Atomicity: money movements are wrapped in ACID DB transactions and double-entry ledger writes.
- Idempotency: transfer endpoints accept idempotency keys so retries are safe.
- Distributed locks: Redis-based locks (ordered acquisition) prevent deadlocks and race conditions.
- Fraud controls: a modular fraud service runs multiple rules in parallel and can short-circuit transfers.
- Observability: structured logging and health endpoints are available for each service.
- Event-driven: completion/failure events are published to Kafka for downstream consumers.

---

## Architecture

High-level topology (same diagram in `DECISIONS.md`):

```
    [Web UI] ----> [API Gateway] ----> [Services (Account, Payment, Fraud, Webhook, Notification)]
                           |                      |       |         |
                           v                      v       v         v
                       [Postgres]             [Redis]  [Kafka]  [External Webhooks]
```

For quick visual identity, the project logo is included above and served by the frontend from `settlr-ui/public/settlr_logo.svg`.

---

## Folder layout (monorepo)

```
settlr/
├── packages/       # shared libs and types
├── services/       # microservices (api-gateway, payment, account, fraud, ...)
├── settlr-ui/      # React + Vite application
├── scripts/        # utilities and dev scripts
├── docker-compose.yml
├── start-all.ps1   # orchestration helper (Windows)
└── README_DETAILED.md
```

---

## Getting started — Local development

Prerequisites

- Node.js 20+ (LTS recommended)
- npm 9+
- Docker (optional — for running Postgres/Kafka locally)

Quick start (recommended):

```powershell
# 1. Clone
git clone <repo-url>
cd settlr

# 2. Copy env and edit secrets
Copy-Item .env.example .env
# Edit .env to point at local Postgres/Redis/Kafka or cloud dev instances

# 3. Install (top-level will install workspace packages)
npm install

# 4. Start everything (dev):
.\start-all.ps1

# 5. Frontend (if running separately):
cd settlr-ui
npm run dev
# Open http://localhost:5173
```

If you prefer containers, run:

```bash
docker compose up --build
```

Health endpoints are exposed per service; see `scripts/check-health.ps1` to get an aggregated view.

---

## Configuration & environment variables

See the top-level `.env.example`. Important variables include:

- `DATABASE_URL` — Postgres connection string used by services
- `REDIS_URL` — Redis/Upstash connection used for locking and caches
- `KAFKA_*` — Kafka brokers and credentials
- `JWT_SECRET` — Signing key for API tokens
- `RESEND_API_KEY` — API key used by Notification service (email)

Be careful with production secrets — never commit `.env` files to source control.

---

## Service API summary

Endpoints are exposed behind the API Gateway (port 3000 by default). Notable endpoints:

- `POST /api/auth/register` — user registration
- `POST /api/auth/login` — login and token issuance
- `GET /api/accounts/me` — get current user
- `POST /api/payments/transfer` — initiate a transfer (use `Idempotency-Key` header)
- `GET /api/payments/:id` — fetch transfer details

Refer to each service folder for full OpenAPI or route definitions.

---

## Data model (simplified)

- `accounts` — { id, user_id, balance, currency, version }
- `transactions` — { id, from_account_id, to_account_id, amount, status }
- `ledger_entries` — double-entry lines: { id, transaction_id, account_id, delta, balance_before, balance_after }

Important constraints:

- `accounts.version` is used for optimistic concurrency checks.
- `ledger_entries` are immutable once written.

---

## Observability & troubleshooting

- Each service exposes `/health` and `/metrics` endpoints.
- Logs are structured JSON — see `packages/logger` for the format.
- Use `scripts/check-health.ps1` for a quick health overview.

Troubleshooting tips:

- If transfers fail: check Redis lock timeouts, DB deadlocks, and the fraud service response.
- For idempotency problems: ensure the idempotency key is unique per logical intent.

---

## Testing

Unit and integration tests are powered by Vitest.

```bash
# run all tests
npm test

# run tests for a single service
cd services/payment-service
npm run test
```

The repo enforces a minimum coverage threshold in CI.

---

## CI / CD

Workflows (GitHub Actions):

1. `lint + typecheck` — `tsc --noEmit` and ESLint
2. `test` — run Vitest for each service
3. `build` — produce production artifacts and Docker images
4. `release` — tag and push images to container registry (manual approval step)

---

## Security considerations

- Secrets must be provided via environment variables or a secrets manager (do not check into git).
- All webhooks are HMAC-signed using a shared secret stored in the environment.
- User passwords are hashed using bcrypt with a configurable cost factor (`BCRYPT_SALT_ROUNDS`).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run tests and linters locally
4. Open a PR with a concise description and link to related DECISIONS.md if applicable

Please follow conventional commits for change history (feat, fix, chore, refactor, docs).

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

---

If you'd like, I can also:

- Replace the top-level `README.md` with this detailed version and keep a short README linking to it.
- Add more images/screenshots to `settlr-ui/public/` and embed them here (I can capture the current UI screens if you want).

Would you like me to replace the existing `README.md` with this detailed file or create a short index that links to it?
