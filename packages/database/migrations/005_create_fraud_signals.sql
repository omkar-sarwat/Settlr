-- Creates the fraud_signals table — one row per fired fraud rule per transaction. Used for audit trail and future ML training.
-- Each fraud rule that fires creates one row here.
-- signal_data holds rule-specific context as JSONB (e.g. velocity count, average amount).

CREATE TABLE fraud_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  rule_name       VARCHAR(100) NOT NULL,
  score_added     SMALLINT NOT NULL,
  signal_data     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up all fraud signals for a specific transaction
CREATE INDEX idx_fraud_signals_transaction ON fraud_signals(transaction_id);
