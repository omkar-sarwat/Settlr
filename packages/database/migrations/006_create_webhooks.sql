-- Creates webhook_endpoints and webhook_deliveries tables — Stripe-style event delivery with HMAC signing and exponential retry.
-- Merchants register URLs to receive event notifications.
-- secret is used for HMAC-SHA256 signing. Never expose in API responses.

CREATE TABLE webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  url         TEXT NOT NULL,
  secret      VARCHAR(255) NOT NULL,  -- Generated on creation, shown only once
  events      TEXT[] NOT NULL,         -- e.g. ['payment.completed', 'payment.failed']
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Every delivery attempt (including retries) is one row.
-- next_retry_at is set by exponential backoff schedule.
-- status flow: pending → delivered | retrying → failed

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id),
  transaction_id  UUID REFERENCES transactions(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'retrying', 'failed')),
  attempt_number  SMALLINT DEFAULT 1,
  response_code   SMALLINT,
  response_body   TEXT,
  next_retry_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the retry worker — finds deliveries that need retrying
CREATE INDEX idx_webhook_deliveries_retry
  ON webhook_deliveries(next_retry_at)
  WHERE status = 'retrying';

-- Index for looking up all deliveries for a specific endpoint
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
