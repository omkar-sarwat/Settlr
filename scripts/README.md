# Settlr Quick Start Scripts

This folder contains utility scripts to help you run the Settlr platform.

## Main Scripts (Root Directory)

### `start-all.ps1` - Start Everything
Starts all backend services and the UI with one command.

```powershell
# Full startup with dependency installation and migrations
.\start-all.ps1

# Skip dependency installation (faster subsequent runs)
.\start-all.ps1 -SkipInstall

# Skip database migrations
.\start-all.ps1 -SkipMigrations

# Both
.\start-all.ps1 -SkipInstall -SkipMigrations
```

**What it does:**
1. ✅ Checks prerequisites (Node.js, npm)
2. ✅ Verifies `.env` file exists
3. 📦 Installs dependencies (root + UI)
4. 🗄️ Runs database migrations
5. 🚀 Starts all 6 microservices in separate windows
6. 🎨 Starts the UI (Vite dev server)

**Services started:**
- API Gateway (http://localhost:3000)
- Account Service (http://localhost:3001)
- Payment Service (http://localhost:3002)
- Fraud Service (http://localhost:3003)
- Webhook Service (http://localhost:3004)
- Notification Service (http://localhost:3005)
- Settlr UI (http://localhost:5173)

### `stop-all.ps1` - Stop Everything
Stops all running Settlr services.

```powershell
.\stop-all.ps1
```

**What it does:**
- 🛑 Closes all PowerShell windows running Settlr services
- 🔌 Kills orphaned node processes on Settlr ports
- 🧹 Cleans up resources

## Utility Scripts (scripts/ folder)

### `run-migrations.ps1` - Database Migrations
Runs all SQL migration files in order.

```powershell
.\scripts\run-migrations.ps1
```

**Requirements:**
- `DATABASE_URL` must be set in `.env`
- PostgreSQL client tools (`psql`) or Node.js `pg` package

### `start-service.ps1` - Start Single Service
Starts a specific microservice with environment variables loaded.

```powershell
.\scripts\start-service.ps1 -Service "account-service"
```

### `verify-db.js` - Verify Database Connection
Tests database connectivity and shows table count.

```powershell
node .\scripts\verify-db.js
```

### `seed-balance.js` - Seed Test Data
Seeds initial account balances for testing.

```powershell
node .\scripts\seed-balance.js
```

## First Time Setup

1. **Clone the repository**
   ```powershell
   git clone <repo-url>
   cd settlr
   ```

2. **Create `.env` file**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your values
   ```

3. **Run everything**
   ```powershell
   .\start-all.ps1
   ```

4. **Access the app**
   - Open browser: http://localhost:5173
   - Login or create an account

## Subsequent Runs

```powershell
# Fast startup (skip install, keep migrations)
.\start-all.ps1 -SkipInstall

# Fastest startup (skip both)
.\start-all.ps1 -SkipInstall -SkipMigrations
```

## Individual Service Development

If you want to work on just one service:

```powershell
# Terminal 1: Start dependencies manually
npm run dev:account
npm run dev:payment
# etc...

# Terminal 2: Start UI
cd settlr-ui
npm run dev
```

Or use the workspace scripts from root:
```powershell
npm run dev:gateway   # API Gateway
npm run dev:account   # Account Service
npm run dev:payment   # Payment Service
npm run dev:fraud     # Fraud Service
npm run dev:webhook   # Webhook Service
npm run dev:notification # Notification Service
npm run dev:ui        # UI only
```

## Troubleshooting

### Ports already in use
```powershell
# Stop all services first
.\stop-all.ps1

# Find process on specific port
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
```

### Migrations failing
```powershell
# Verify database connection
node .\scripts\verify-db.js

# Check DATABASE_URL in .env
cat .env | Select-String "DATABASE_URL"
```

### Services won't start
```powershell
# Check .env file exists
Test-Path .env

# Reinstall dependencies
npm install
cd settlr-ui; npm install; cd ..

# Try manual start
.\start-all.ps1 -SkipMigrations
```

## Environment Variables Required

See `.env.example` for all required variables. Key ones:

- `DATABASE_URL` - PostgreSQL connection string
- `UPSTASH_REDIS_URL` - Redis connection string (or local Redis)
- `KAFKA_BROKER` - Kafka broker URL
- `JWT_SECRET` - Secret for JWT tokens
- `RESEND_API_KEY` - Email service API key

## Architecture

```
settlr/
├── services/              # 6 microservices
│   ├── api-gateway/       # Port 3000 (main entry)
│   ├── account-service/   # Port 3001
│   ├── payment-service/   # Port 3002
│   ├── fraud-service/     # Port 3003
│   ├── webhook-service/   # Port 3004
│   └── notification-service/ # Port 3005
├── packages/              # Shared libraries
│   ├── config/
│   ├── database/
│   ├── kafka/
│   ├── logger/
│   └── types/
├── settlr-ui/             # React frontend (Port 5173)
└── scripts/               # Utility scripts
```
