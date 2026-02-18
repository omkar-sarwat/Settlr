-- Creates the accounts table — holds user financial accounts with balance in paise and optimistic locking via version column.
-- balance is always in PAISE (smallest unit). ₹100 = 10000 paise. NEVER store float.
-- version column is for optimistic locking — increment on every balance update.

CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),  -- NEVER remove this constraint
  currency    CHAR(3) NOT NULL DEFAULT 'INR',
  status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'frozen', 'closed')),
  version     INTEGER NOT NULL DEFAULT 0,   -- For optimistic locking
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up all accounts belonging to a user
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
