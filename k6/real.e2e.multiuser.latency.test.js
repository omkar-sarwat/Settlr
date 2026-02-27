import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const expectedStatuses = http.expectedStatuses({ min: 200, max: 299 }, 400, 403, 409, 422, 429);

const accountListLatency = new Trend('account_list_latency_ms', true);
const paymentCreateLatency = new Trend('payment_create_latency_ms', true);
const profileReadLatency = new Trend('profile_read_latency_ms', true);
const e2eLatency = new Trend('e2e_latency_ms', true);

const successRate = new Rate('e2e_success_rate');
const errorRate = new Rate('e2e_error_rate');

const USERS = [
  'test@settlr.dev',
  'rahul.sharma@example.com',
  'priya.patel@example.com',
  'amit.singh@example.com',
  'neha.gupta@example.com',
  'vikram.mehta@example.com',
  'ananya.reddy@example.com',
  'arjun.kumar@example.com',
];

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

function login(email, password) {
  const res = http.post(
    `${__ENV.API_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), timeout: '10s' }
  );

  if (res.status !== 200) {
    return null;
  }

  return {
    email,
    accessToken: res.json('data.accessToken'),
    accountId: res.json('data.account.id'),
  };
}

export const options = {
  scenarios: {
    account_reads: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'accountScenario',
    },
    payment_writes: {
      executor: 'constant-arrival-rate',
      rate: 4,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'paymentScenario',
      startTime: '5s',
    },
    profile_reads: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'profileScenario',
      startTime: '10s',
    },
  },
  thresholds: {
    e2e_success_rate: ['rate>0.98'],
    e2e_error_rate: ['rate<0.02'],
    account_list_latency_ms: ['p(95)<300', 'p(99)<500'],
    payment_create_latency_ms: ['p(95)<250', 'p(99)<500'],
    profile_read_latency_ms: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<350', 'p(99)<600'],
  },
};

export function setup() {
  const password = __ENV.LOAD_TEST_PASSWORD || 'password123';
  const sessions = [];

  for (const email of USERS) {
    const session = login(email, password);
    if (session) {
      sessions.push(session);
    }
  }

  if (sessions.length < 4) {
    throw new Error(`Only ${sessions.length} users logged in; need >= 4 for multi-user load test.`);
  }

  return { sessions };
}

function pickSession(data) {
  return data.sessions[randomInt(data.sessions.length)];
}

export function accountScenario(data) {
  const session = pickSession(data);
  const start = Date.now();
  const res = http.get(`${__ENV.API_URL}/api/v1/accounts`, {
    headers: jsonHeaders({ Authorization: `Bearer ${session.accessToken}` }),
    timeout: '10s',
    responseCallback: expectedStatuses,
  });
  const elapsed = Date.now() - start;

  accountListLatency.add(elapsed);
  e2eLatency.add(elapsed);

  const ok = check(res, {
    'accounts status 200': (r) => r.status === 200,
    'accounts payload array': (r) => Array.isArray(r.json('data')),
  });

  successRate.add(ok);
  errorRate.add(!ok);
}

export function paymentScenario(data) {
  const session = pickSession(data);
  let recipient = data.sessions[randomInt(data.sessions.length)].accountId;

  if (recipient === session.accountId) {
    recipient = data.sessions[(randomInt(data.sessions.length - 1) + 1) % data.sessions.length].accountId;
  }

  const idem = `${__VU}-${__ITER}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const start = Date.now();
  const res = http.post(
    `${__ENV.API_URL}/api/v1/payments`,
    JSON.stringify({
      toAccountId: recipient,
      amount: Math.floor(Math.random() * 1500) + 100,
      currency: 'INR',
      description: 'real-e2e-multiuser-k6',
    }),
    {
      headers: jsonHeaders({
        Authorization: `Bearer ${session.accessToken}`,
        'Idempotency-Key': idem,
      }),
      timeout: '15s',
      responseCallback: expectedStatuses,
    }
  );
  const elapsed = Date.now() - start;

  paymentCreateLatency.add(elapsed);
  e2eLatency.add(elapsed);

  const ok = check(res, {
    'payment status expected': (r) => [201, 400, 403, 409, 422, 429].includes(r.status),
    'payment has trace id': (r) => !!r.json('traceId'),
    'payment no 5xx': (r) => r.status < 500,
  });

  successRate.add(ok);
  errorRate.add(!ok);
}

export function profileScenario(data) {
  const session = pickSession(data);
  const start = Date.now();
  const res = http.get(`${__ENV.API_URL}/api/v1/auth/profile`, {
    headers: jsonHeaders({ Authorization: `Bearer ${session.accessToken}` }),
    timeout: '10s',
    responseCallback: expectedStatuses,
  });
  const elapsed = Date.now() - start;

  profileReadLatency.add(elapsed);
  e2eLatency.add(elapsed);

  const ok = check(res, {
    'profile status 200': (r) => r.status === 200,
    'profile has user id': (r) => !!r.json('data.id'),
  });

  successRate.add(ok);
  errorRate.add(!ok);
}
