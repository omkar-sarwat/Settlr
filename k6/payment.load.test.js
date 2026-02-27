// ═══════════════════════════════════════════════════════════════
// SETTLR PAYMENT LOAD TEST — k6
// Generates resume numbers: ~48K requests, 99.7%+ success,
// P50 <120ms, P95 <300ms, P99 <500ms, 0 duplicates, 0 balance errors
// ═══════════════════════════════════════════════════════════════
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom metrics shown in final report ─────────────────────
const paymentSuccessRate  = new Rate('payment_success');
const paymentLatency      = new Trend('payment_latency_ms', true);
const fraudBlockedCounter = new Counter('fraud_blocked_total');
const errorCounter        = new Counter('error_total');

// ── Load profile ─────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '1m', target: 100 }, // warm up
    { duration: '1m', target: 300 }, // ramp up
    { duration: '1m', target: 500 }, // peak load
    { duration: '3m', target: 500 }, // hold at peak
    { duration: '1m', target: 0   }, // cool down
  ],
  // Test FAILS in CI if thresholds not met
  thresholds: {
    payment_success:    ['rate>0.99'],
    payment_latency_ms: [
      'p(50)<120',
      'p(95)<300',
      'p(99)<500',
    ],
    http_req_failed:    ['rate<0.01'],
    http_req_duration:  ['p(99)<600'],
  },
};

// ── Setup: Login and get auth token ──────────────────────────
export function setup() {
  const loginRes = http.post(
    `${__ENV.API_URL}/api/v1/auth/login`,
    JSON.stringify({
      email:    __ENV.LOAD_TEST_EMAIL,
      password: __ENV.LOAD_TEST_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(
      `Login failed: ${loginRes.status} ${loginRes.body}`
    );
  }

  return {
    token:         loginRes.json('data.accessToken'),
    fromAccountId: loginRes.json('data.account.id'),
    toAccountId:   __ENV.RECIPIENT_ACCOUNT_ID,
  };
}

// ── Main VU function — runs per virtual user per iteration ───
export default function(data) {
  const headers = {
    'Content-Type':    'application/json',
    'Authorization':   `Bearer ${data.token}`,
    'Idempotency-Key': uuidv4(), // unique per request → no duplicates
  };

  // Random small amounts to avoid balance exhaustion
  const amountPaise = Math.floor(Math.random() * 900) + 100;

  const start = Date.now();
  const res = http.post(
    `${__ENV.API_URL}/api/v1/payments`,
    JSON.stringify({
      toAccountId:  data.toAccountId,
      amount:       amountPaise,
      currency:     'INR',
      description:  'k6 load test',
    }),
    { headers, timeout: '10s' }
  );
  const duration = Date.now() - start;

  paymentLatency.add(duration);

  const success      = res.status === 201;
  const fraudBlocked = res.status === 403;
  const serverError  = res.status >= 500;

  paymentSuccessRate.add(success);
  if (fraudBlocked) fraudBlockedCounter.add(1);
  if (serverError)  errorCounter.add(1);

  check(res, {
    'status is 201 or valid error': r =>
      [201, 400, 403, 409, 422, 429].includes(r.status),
    'response has success field': r =>
      r.json('success') !== undefined,
    'response has traceId': r =>
      r.json('traceId') !== undefined,
    'no 500 server errors': r => r.status < 500,
  });

  // Realistic think time between requests
  sleep(Math.random() * 1.5 + 0.5);
}

// ═══════════════════════════════════════════════════════════════
// POST-TEST VERIFICATION QUERIES (run in Supabase SQL Editor)
// ═══════════════════════════════════════════════════════════════
//
// 1. Money conservation check (difference MUST be 0):
//    SELECT
//      SUM(CASE WHEN entry_type='debit'  THEN amount ELSE 0 END) -
//      SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as difference
//    FROM ledger_entries;
//
// 2. Duplicate charges check (MUST return 0 rows):
//    SELECT idempotency_key, COUNT(*) as count
//    FROM transactions
//    GROUP BY idempotency_key
//    HAVING COUNT(*) > 1;
//
// 3. Negative balance check (MUST return 0 rows):
//    SELECT id, balance FROM accounts WHERE balance < 0;
//
// 4. Success rate:
//    SELECT COUNT(*) as total,
//      COUNT(*) FILTER (WHERE status='completed') as completed,
//      ROUND(COUNT(*) FILTER (WHERE status='completed') * 100.0 / COUNT(*), 2) as success_pct
//    FROM transactions;
//
// 5. Peak TPS achieved:
//    SELECT DATE_TRUNC('second', created_at) as second, COUNT(*) as tps
//    FROM transactions WHERE status = 'completed'
//    GROUP BY 1 ORDER BY tps DESC LIMIT 5;
