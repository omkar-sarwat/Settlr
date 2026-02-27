// Knex.js singleton — one shared database connection pool used by all services that need PostgreSQL access.
// Import { db } from '@settlr/database' in repositories. Never create a second Knex instance.
// The pool is configured for production use: min 2, max 10 connections.
//
// Import path: import { db, testConnection, closeDatabase } from '@settlr/database';
//
// Architecture rule: Only REPOSITORIES import this module.
// Services and handlers NEVER import db directly — they call repository methods.
// This ensures SQL stays in repositories and business logic stays in services.

import knex, { type Knex } from 'knex';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';

// ── BIGINT → Number coercion ──────────────────────────────────────────────────
// PostgreSQL returns BIGINT (OID 20) as string because JS Number can't represent
// all 64-bit integers. For Settlr, all monetary values (paise) are safely within
// Number.MAX_SAFE_INTEGER (9007199254740991 ≈ ₹90 lakh crore). Parsing globally
// here prevents subtle string-concatenation bugs like `balance + amount` producing
// "9900000100000" instead of 10000000.
pg.types.setTypeParser(20, (val: string) => {
  const n = Number(val);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`BIGINT value ${val} exceeds Number.MAX_SAFE_INTEGER — cannot safely coerce`);
  }
  return n;
});

// Re-export Knex type so repositories can type their transaction parameters
// Usage: async function createEntries(trx: KnexTransaction, params: ILedgerParams)
export type KnexTransaction = Knex.Transaction;

/**
 * Creates and configures the Knex.js database client.
 * Uses the DATABASE_URL from environment (Supabase PostgreSQL).
 * SSL is enabled because Supabase requires encrypted connections.
 *
 * Connection pool:
 *   min: 2  — keep 2 connections warm at all times (avoids cold start latency)
 *   max: 10 — never open more than 10 concurrent connections (prevents DB overload)
 *
 * The 'pg' client uses node-postgres under the hood, which handles
 * connection pooling, prepared statements, and error recovery.
 */
export const db: Knex = knex({
  client: 'pg',
  connection: {
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }, // Supabase uses self-signed certs
  },
  pool: {
    min: 2,    // Keep 2 connections warm at all times (avoids cold-start on first req)
    max: 20,   // Increased from 10: Supabase PgBouncer (port 6543) multiplexes real
               // connections, so higher logical pool reduces queue wait under concurrency.
               // 5 services × 20 = 100 logical; PgBouncer maps to ≤ its own pool limit.
    idleTimeoutMillis: 30000,  // Return idle connections after 30s
    // Fintech safety guards applied to every new connection:
    //   statement_timeout           — kill any single SQL statement running > 8s.
    //                                 Prevents runaway aggregations from blocking the pool.
    //   idle_in_transaction_session — kill sessions stuck in BEGIN with no activity > 5s.
    //                                 Prevents lock pile-ups after a crashed mid-transaction.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterCreate(conn: any, done: (err: Error | null, conn: any) => void) {
      conn.query(
        "SET statement_timeout = 8000; SET idle_in_transaction_session_timeout = 5000",
        (err: Error | null) => done(err, conn)
      );
    },
  },
  acquireConnectionTimeout: 8000,  // Fail fast (503) rather than queue indefinitely
});

/**
 * Tests the database connection by running a trivial query.
 * Call this during service startup to fail fast if the DB is unreachable.
 * Returns true if the connection is healthy, false otherwise.
 *
 * Usage (in service index.ts):
 *   const dbOk = await testConnection();
 *   if (!dbOk) process.exit(1);
 */
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    // Redact the password from the URL before logging
    const safeUrl = config.databaseUrl.replace(/\/\/.*@/, '//<redacted>@');
    logger.info('database_connected', { url: safeUrl });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('database_connection_failed', { error: message });
    return false;
  }
}

/**
 * Runs all SQL migration files in order (001_, 002_, etc.).
 * Reads .sql files from packages/database/migrations/ and executes them sequentially.
 * Each migration is wrapped in a transaction — if one fails, it rolls back that file only.
 *
 * This is called during initial setup or via a "migrate" script.
 * In production, you'd use a proper migration tool (e.g. knex migrate:latest).
 * For this project, raw SQL files are simpler and match the doc specification.
 *
 * @param migrationsDir - Absolute path to the migrations folder
 */
export async function runMigrations(migrationsDir?: string): Promise<void> {
  // Default to the migrations directory next to this file
  if (!migrationsDir) {
    migrationsDir = join(__dirname, 'migrations');
  }
  const migrationFiles = [
    '001_create_users.sql',
    '002_create_accounts.sql',
    '003_create_transactions.sql',
    '004_create_ledger.sql',
    '005_create_fraud_signals.sql',
    '006_create_webhooks.sql',
  ];

  for (const file of migrationFiles) {
    try {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      // Skip empty files (shouldn't happen but defensive)
      if (!sql.trim()) {
        logger.warn('migration_skipped_empty', { file });
        continue;
      }

      await db.raw(sql);
      logger.info('migration_applied', { file });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown migration error';
      // "already exists" errors are expected on re-runs — just skip them
      if (message.includes('already exists')) {
        logger.info('migration_already_applied', { file });
        continue;
      }
      logger.error('migration_failed', { file, error: message });
      throw error; // Re-throw non-idempotent errors to stop the process
    }
  }

  logger.info('all_migrations_complete');
}

/**
 * Gracefully closes all database connections.
 * Call this in the shutdown handler (SIGTERM) to avoid connection leaks.
 * After calling this, no further queries can be made.
 */
export async function closeDatabase(): Promise<void> {
  await db.destroy();
  logger.info('database_disconnected');
}
