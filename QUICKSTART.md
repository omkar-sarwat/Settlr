# 🚀 Settlr Quick Reference

## One-Liner Startup

```powershell
# First time setup
.\start-all.ps1

# Daily development (fastest)
.\dev-quick.ps1

# Or use npm
npm start
```

## Main Scripts

| Script | Purpose | Speed |
|--------|---------|-------|
| `.\start-all.ps1` | Full startup with install + migrations | ⭐⭐ Slow (first run) |
| `.\dev-quick.ps1` | Fast dev mode (no install/migrations) | ⚡⚡⚡ Fast |
| `.\start-all.ps1 -SkipInstall` | Skip npm install only | ⚡⚡ Medium |
| `.\stop-all.ps1` | Stop all services | ⚡ Instant |
| `.\check-health.ps1` | Check if services are running | ⚡ Instant |

## Service URLs

```
API Gateway:          http://localhost:3000
Account Service:      http://localhost:3001
Payment Service:      http://localhost:3002
Fraud Service:        http://localhost:3003
Webhook Service:      http://localhost:3004
Notification Service: http://localhost:3005
Settlr UI:            http://localhost:5173
```

## NPM Commands

```powershell
npm start              # Start all services
npm stop               # Stop all services
npm run health         # Health check

# Individual services
npm run dev:gateway
npm run dev:account
npm run dev:payment
npm run dev:fraud
npm run dev:webhook
npm run dev:notification
npm run dev:ui
```

## Common Tasks

### First Time Setup
```powershell
git clone <repo-url>
cd settlr
Copy-Item .env.example .env
# Edit .env file
.\start-all.ps1
```

### Daily Development
```powershell
.\dev-quick.ps1
# Opens 7 windows (6 services + UI)
```

### Stop Everything
```powershell
.\stop-all.ps1
```

### Database Operations
```powershell
# Run migrations
.\scripts\run-migrations.ps1

# Verify DB connection
node .\scripts\verify-db.js

# Seed test data
node .\scripts\seed-balance.js
```

### Troubleshooting

#### Port already in use
```powershell
.\stop-all.ps1
# or find and kill specific port
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

#### Services won't start
```powershell
# Check .env exists
Test-Path .env

# Reinstall dependencies
npm install
cd settlr-ui; npm install; cd ..

# Check health
.\check-health.ps1
```

#### Migration errors
```powershell
node .\scripts\verify-db.js  # Test connection
cat .env | Select-String "DATABASE_URL"  # Verify URL
```

#### UI not loading
```powershell
cd settlr-ui
npm install
npm run dev
```

## Environment Variables

Required in `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
UPSTASH_REDIS_URL=redis://...
KAFKA_BROKER=pkc-xxx.us-east-1.aws.confluent.cloud:9092
KAFKA_USERNAME=xxx
KAFKA_PASSWORD=xxx
JWT_SECRET=your-super-secret-key
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@settlr.com
```

## Project Structure

```
settlr/
├── start-all.ps1          # Full startup
├── dev-quick.ps1          # Fast dev mode
├── stop-all.ps1           # Stop everything
├── check-health.ps1       # Health check
├── services/              # 6 microservices
│   ├── api-gateway/       # :3000
│   ├── account-service/   # :3001
│   ├── payment-service/   # :3002
│   ├── fraud-service/     # :3003
│   ├── webhook-service/   # :3004
│   └── notification-service/  # :3005
├── settlr-ui/             # :5173 (React)
├── packages/              # Shared libraries
└── scripts/               # Utility scripts
```

## Testing Flow

1. **Start services**: `.\dev-quick.ps1`
2. **Open UI**: http://localhost:5173
3. **Register user**: Create account
4. **Check balance**: Should see ₹0
5. **Seed data**: `node .\scripts\seed-balance.js`
6. **Send money**: Test transfer flow
7. **Check fraud**: View admin panel
8. **Stop**: `.\stop-all.ps1`

## Git Workflow

```powershell
# Create feature branch
git checkout -b feature/your-feature

# Make changes
# Test locally
.\dev-quick.ps1

# Commit
git add .
git commit -m "feat: your feature"

# Push
git push origin feature/your-feature
```

## Production Deployment

```powershell
# Build all services
docker-compose build

# Start in production mode
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Performance Tips

- Use `dev-quick.ps1` for daily work (fastest)
- Keep terminal windows open between sessions
- Only run `start-all.ps1` when dependencies change
- Use `-SkipMigrations` if schema hasn't changed

## Need Help?

- Full docs: [scripts/README.md](scripts/README.md)
- Architecture: [README.md](README.md)
- Issues: Check GitHub Issues

---

**Happy coding! 🚀**
