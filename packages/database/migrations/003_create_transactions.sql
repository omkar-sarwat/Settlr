-- Creates the transactions table — records every money transfer with idempotency key, fraud score, and status tracking.
-- idempotency_key: client-generated UUID. UNIQUE prevents double charges.
-- fraud_score: 0-100. Stored for audit trail.
-- status flow: pending → processing → completed | failed | reversed

CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   VARCHAR(255) UNIQUE NOT NULL,
  from_account_id   UUID REFERENCES accounts(id),
  to_account_id     UUID REFERENCES accounts(id),
  amount            BIGINT NOT NULL CHECK (amount > 0),  -- In paise
  currency          CHAR(3) NOT NULL DEFAULT 'INR',
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  failure_reason    TEXT,
  fraud_score       SMALLINT CHECK (fraud_score BETWEEN 0 AND 100),
  fraud_action      VARCHAR(20) CHECK (fraud_action IN ('approve', 'review', 'challenge', 'decline')),
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for looking up transactions by account (sorted newest first)
CREATE INDEX idx_transactions_from_account ON transactions(from_account_id, created_at DESC);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id, created_at DESC);

-- Partial index for pending transactions (used by background workers)
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status = 'pending';
