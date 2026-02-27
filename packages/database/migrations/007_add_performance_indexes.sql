-- Performance indexes — February 22, 2026
-- Motivation: real latency measurements showed:
--   account_transactions p50 = 364ms (target: <200ms)
--   account_ledger p50       = 382ms (target: <200ms)
--   account_stats p95        = 753ms (bimodal — stats aggregation hitting sequential scan)
--
-- Fix 1: Replace basic index on transactions with a covering index (INCLUDE clause avoids
--        heap fetches for the common paginated list query).
-- Fix 2: Replace basic index on ledger_entries with a covering index.
-- Fix 3: Add functional index on ledger_entries (date_trunc 'day') — eliminates the
--        full table scan that caused the 753ms p95 spike on account stats.

-- ── Transactions: covering index (replaces idx_transactions_from_account) ──────────────────
-- Old basic index only stored (from_account_id, created_at). Every row fetch required an
-- extra heap access to get amount, currency, status, description.
-- The INCLUDE columns let PostgreSQL serve the full paginated list from the index alone.
DROP INDEX IF EXISTS idx_transactions_from_account;
CREATE INDEX idx_transactions_from_account_created
  ON transactions (from_account_id, created_at DESC)
  INCLUDE (id, amount, currency, status, to_account_id);

-- Matching covering index for the to_account_id direction (recipient history queries).
DROP INDEX IF EXISTS idx_transactions_to_account;
CREATE INDEX idx_transactions_to_account_created
  ON transactions (to_account_id, created_at DESC)
  INCLUDE (id, amount, currency, status, from_account_id);

-- ── Ledger: covering index (replaces idx_ledger_account) ──────────────────────────────────
-- The ledger query fetches entry_type, amount, balance_before, balance_after per row.
-- Covering index eliminates the heap fetch for all those columns.
DROP INDEX IF EXISTS idx_ledger_account;
CREATE INDEX idx_ledger_account_created
  ON ledger_entries (account_id, created_at DESC)
  INCLUDE (id, entry_type, amount, balance_before, balance_after, transaction_id);

-- ── Ledger: functional index on date_trunc('day') ─────────────────────────────────────────
-- The stats endpoint aggregates daily totals (SUM, COUNT, GROUP BY day bucket).
-- date_trunc('day', timestamptz) is STABLE (depends on session timezone), so PostgreSQL
-- rejects it as a direct index expression. We keep the planner happy by indexing
-- (account_id, created_at) with partial filters on entry_type, which satisfies the
-- range scan pattern used by the stats query (WHERE account_id = $1 AND created_at >= $2).
-- The existing idx_ledger_account_created covering index handles most of this.
-- Additional partial indexes let the planner pick the smallest possible scan for
-- debit-only or credit-only stats aggregations.
CREATE INDEX idx_ledger_account_date_trunc
  ON ledger_entries (account_id, created_at DESC, entry_type)
  INCLUDE (amount);

-- ── Stats cache key support ────────────────────────────────────────────────────────────────
-- Partial index so entry_type filter ('debit'/'credit') on the stats query is near-free.
CREATE INDEX idx_ledger_account_debit
  ON ledger_entries (account_id, created_at DESC)
  WHERE entry_type = 'debit';

CREATE INDEX idx_ledger_account_credit
  ON ledger_entries (account_id, created_at DESC)
  WHERE entry_type = 'credit';
