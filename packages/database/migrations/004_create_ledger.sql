-- Creates the ledger_entries table — immutable double-entry bookkeeping rows. Every transfer creates exactly 2 rows (debit + credit).
-- balance_before + balance_after creates an audit trail for every balance change.
-- NEVER hard delete these rows. EVER.

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

-- Index for looking up ledger entries by account (sorted newest first)
CREATE INDEX idx_ledger_account ON ledger_entries(account_id, created_at DESC);

-- Index for looking up all ledger entries for a specific transaction
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
