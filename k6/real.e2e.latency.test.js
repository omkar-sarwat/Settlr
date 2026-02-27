import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const authLoginLatency = new Trend('auth_login_latency_ms', true);
const accountListLatency = new Trend('account_list_latency_ms', true);
const paymentCreateLatency = new Trend('payment_create_latency_ms', true);
const e2eLatency = new Trend('e2e_latency_ms', true);

const successRate = new Rate('e2e_success_rate');
const errorRate = new Rate('e2e_error_rate');
const payment2xxCounter = new Counter('payment_2xx_total');
const payment4xxCounter = new Counter('payment_4xx_total');

function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

function login(email, password) {
  const start = Date.now();
  const response = http.post(
    `${__ENV.API_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), timeout: '10s' }
  );
  const elapsed = Date.now() - start;
  authLoginLatency.add(elapsed);
  e2eLatency.add(elapsed);

  const ok = check(response, {
    'auth login status is 200': (r) => r.status === 200,
    'auth login has access token': (r) => !!r.json('data.accessToken'),
  });

  successRate.add(ok);
  errorRate.add(!ok);

  if (!ok) {
    return null;
  }

  return {
    accessToken: response.json('data.accessToken'),
    accountId: response.json('data.account.id'),
  };
}

export const options = {
  discardResponseBodies: false,
  scenarios: {
    auth_flow: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 20,
      maxVUs: 60,
      exec: 'authScenario',
    },
    account_reads: {
      executor: 'constant-arrival-rate',
      rate: 25,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 40,
      maxVUs: 120,
      exec: 'accountScenario',
      startTime: '5s',
    },
    payment_writes: {
      executor: 'constant-arrival-rate',
      rate: 18,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 60,
      maxVUs: 180,
      exec: 'paymentScenario',
      startTime: '10s',
    },
  },
  thresholds: {
    e2e_success_rate: ['rate>0.95'],
    e2e_error_rate: ['rate<0.05'],
    auth_login_latency_ms: ['p(95)<350', 'p(99)<700'],
    account_list_latency_ms: ['p(95)<250', 'p(99)<500'],
    payment_create_latency_ms: ['p(95)<450', 'p(99)<900'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export function setup() {
  const bootstrap = login(__ENV.LOAD_TEST_EMAIL, __ENV.LOAD_TEST_PASSWORD);
  if (!bootstrap) {
    throw new Error('Unable to authenticate in setup(). Check test credentials.');
  }

  return {
    accessToken: bootstrap.accessToken,
    fromAccountId: bootstrap.accountId,
    toAccountId: __ENV.RECIPIENT_ACCOUNT_ID,
    email: __ENV.LOAD_TEST_EMAIL,
    password: __ENV.LOAD_TEST_PASSWORD,
  };
}

export function authScenario(data) {
  const result = login(data.email, data.password);
  if (!result) {
    return;
  }
}

export function accountScenario(data) {
  const start = Date.now();
  const response = http.get(`${__ENV.API_URL}/api/v1/accounts`, {
    headers: jsonHeaders({ Authorization: `Bearer ${data.accessToken}` }),
    timeout: '10s',
  });
  const elapsed = Date.now() - start;
  accountListLatency.add(elapsed);
  e2eLatency.add(elapsed);

  const ok = check(response, {
    'accounts status is 200': (r) => r.status === 200,
    'accounts payload present': (r) => Array.isArray(r.json('data')),
  });

  successRate.add(ok);
  errorRate.add(!ok);
}

export function paymentScenario(data) {
  const idem = `${__VU}-${__ITER}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const amount = Math.floor(Math.random() * 4000) + 100;

  const start = Date.now();
  const response = http.post(
    `${__ENV.API_URL}/api/v1/payments`,
    JSON.stringify({
      toAccountId: data.toAccountId,
      amount,
      currency: 'INR',
      description: 'real-e2e-k6-latency',
    }),
    {
      headers: jsonHeaders({
        Authorization: `Bearer ${data.accessToken}`,
        'Idempotency-Key': idem,
      }),
      timeout: '15s',
    }
  );
  const elapsed = Date.now() - start;
  paymentCreateLatency.add(elapsed);
  e2eLatency.add(elapsed);

  if (response.status >= 200 && response.status < 300) {
    payment2xxCounter.add(1);
  }
  if (response.status >= 400 && response.status < 500) {
    payment4xxCounter.add(1);
  }

  const ok = check(response, {
    'payment status is expected': (r) => [201, 400, 403, 409, 422, 429].includes(r.status),
    'payment has traceId': (r) => !!r.json('traceId'),
    'payment has no 5xx': (r) => r.status < 500,
  });

  successRate.add(ok);
  errorRate.add(!ok);
}
