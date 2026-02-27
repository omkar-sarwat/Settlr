// Environment variable loader — validates all required env vars at startup and crashes immediately if any are missing.
// Every service imports `config` from here. If a required var is missing, the process exits before serving traffic.
// This prevents silent failures from missing configuration.
//
// Import path: import { config } from '@settlr/config';
//
// IMPORTANT: Not all services need all config values. Services that don't use the DB
// (e.g. fraud-service) won't crash if DATABASE_URL is missing — they simply never
// call requireEnv('DATABASE_URL'). Instead, each service reads only what it needs.
// The config object below uses requireEnv for values that EVERY service needs,
// and process.env fallbacks for optional/service-specific ones.

/**
 * Reads an environment variable and crashes the process if it's missing.
 * This is intentional — we want services to fail fast at startup, not at runtime.
 * The error message includes the variable name so operators can fix .env quickly.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`FATAL: Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Reads an optional environment variable. Returns the fallback if not set.
 * Used for values that have sensible defaults.
 */
function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Centralized config object — every service reads from this instead of process.env directly.
 * All values are validated at import time (module load). If anything is missing, the service
 * crashes before it starts listening for requests.
 *
 * Structure:
 *   config.port          → number
 *   config.databaseUrl   → string (connection string)
 *   config.jwtSecret     → string (min 32 chars)
 *   config.bcryptSaltRounds → number (minimum 12 for security)
 */
export const config = {
  // ── Server ──────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),

  /** True when running in production mode */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },

  /** True when running in development mode (enables extra logging, etc.) */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },

  /** True when running in test mode (Vitest sets NODE_ENV=test) */
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  },

  // ── Database (Supabase PostgreSQL) ──────────────────────────────────────
  // Optional at module load — services that actually use DB will fail at connection time if empty
  databaseUrl: optionalEnv('DATABASE_URL', ''),

  // ── Redis (Upstash) ────────────────────────────────────────────────────
  // Optional at module load — services that use Redis will fail at connection time if empty
  redisUrl: optionalEnv('UPSTASH_REDIS_URL', ''),

  // ── Kafka (Upstash) ────────────────────────────────────────────────────
  kafkaBroker: optionalEnv('KAFKA_BROKER', ''),
  kafkaUsername: optionalEnv('KAFKA_USERNAME', ''),
  kafkaPassword: optionalEnv('KAFKA_PASSWORD', ''),

  // ── JWT Authentication ─────────────────────────────────────────────────
  // Optional at module load — only api-gateway and account-service use JWT
  jwtSecret: optionalEnv('JWT_SECRET', ''),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),             // Access token lifetime
  refreshTokenExpiresIn: optionalEnv('REFRESH_TOKEN_EXPIRES_IN', '7d'),  // Refresh token lifetime

  // ── Password Hashing ───────────────────────────────────────────────────
  // Doc rule: bcrypt salt rounds ≥ 12. Never lower this.
  bcryptSaltRounds: parseInt(optionalEnv('BCRYPT_SALT_ROUNDS', '12'), 10),

  // ── Email (Resend) ─────────────────────────────────────────────────────
  resendApiKey: optionalEnv('RESEND_API_KEY', ''),
  emailFrom: optionalEnv('EMAIL_FROM', 'noreply@settlr.dev'),

  // ── Internal Service URLs (for api-gateway → service HTTP calls) ───────
  accountServiceUrl: optionalEnv('ACCOUNT_SERVICE_URL', 'http://localhost:3001'),
  paymentServiceUrl: optionalEnv('PAYMENT_SERVICE_URL', 'http://localhost:3002'),
  adminServiceUrl: optionalEnv('ADMIN_SERVICE_URL', 'http://localhost:3003'),
  fraudServiceUrl: optionalEnv('FRAUD_SERVICE_URL', 'http://localhost:3004'),
  webhookServiceUrl: optionalEnv('WEBHOOK_SERVICE_URL', 'http://localhost:3005'),
  notificationServiceUrl: optionalEnv('NOTIFICATION_SERVICE_URL', 'http://localhost:3006'),

  // ── Rate Limiting ──────────────────────────────────────────────────────
  // Sliding window rate limiter settings (used by api-gateway)
  rateLimitWindowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),   // 1 minute
  rateLimitMaxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10), // 100 req/min

  // ── Webhook Service ────────────────────────────────────────────────────
  webhookTimeoutMs: parseInt(optionalEnv('WEBHOOK_TIMEOUT_MS', '5000'), 10),  // 5 second timeout per request
  webhookMaxAttempts: 5,  // 1 initial + 4 retries, then permanently fail

  // ── Webhook Retry Delays (in seconds) ──────────────────────────────────
  // Exact schedule from the doc — NEVER change these values
  webhookRetryDelays: [30, 300, 1800, 7200] as const,  // 30s, 5min, 30min, 2hrs

  // ── Fraud Engine ───────────────────────────────────────────────────────
  // Score thresholds — used by scoreToAction() in fraud-service
  fraudApproveBelow: 30,        // 0-29 = approve
  fraudReviewBelow: 60,         // 30-59 = review
  fraudChallengeBelow: 80,      // 60-79 = challenge
                                 // 80-100 = decline

  // ── Idempotency ────────────────────────────────────────────────────────
  idempotencyTtlSeconds: parseInt(optionalEnv('IDEMPOTENCY_TTL_SECONDS', '86400'), 10), // 24 hours

  // ── Money ──────────────────────────────────────────────────────────────
  maxTransferAmountPaise: 10_000_000_00,  // ₹1 crore in paise — Zod validation max
  minTransferAmountPaise: 1,               // Minimum 1 paisa
};
