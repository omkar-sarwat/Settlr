/**
 * REAL AUTH INTEGRATION TESTS
 * ============================================================
 * NO vi.mock() ANYWHERE — hits the real API at localhost:3000.
 * Tests login, profile fetch, token refresh, bad credentials,
 * and registration flow against the live account-service.
 *
 * Requirements: all services must be running (start-all.ps1).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { BASE_URL, realLogin, apiGet, apiPost, uuid, USERS } from './helpers/api';

let accessToken: string;
let refreshToken: string;
let userId: string;

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Service Health', () => {
  it('API Gateway is reachable at localhost:3000', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — REAL CREDENTIALS
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Auth: Login', () => {
  it('logs in with valid credentials and returns JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: USERS.primary.email, password: USERS.primary.password }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: { accessToken: string; refreshToken: string; user: { id: string; email: string } };
    };

    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user.id).toBeTruthy();
    expect(typeof body.data.accessToken).toBe('string');
    expect(body.data.accessToken.split('.').length).toBe(3); // valid JWT = 3 parts

    // Save for subsequent tests
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
    userId = body.data.user.id;
  });

  it('rejects login with wrong password (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: USERS.primary.email, password: 'WRONG_PASSWORD_123' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('rejects login with non-existent email (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `notexist_${uuid()}@test.com`, password: 'password123' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects login with missing fields (400 validation)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@settlr.dev' }), // missing password
    });
    expect(res.status).toBe(400);
  });

  it('rejects login with invalid email format (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — AUTHENTICATED ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Auth: Profile', () => {
  beforeAll(async () => {
    if (!accessToken) {
      const tokens = await realLogin(USERS.primary.email, USERS.primary.password);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      userId = tokens.userId;
    }
  });

  it('fetches real user profile with valid JWT', async () => {
    const res = await apiGet('/api/v1/auth/profile', accessToken);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string; email: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.email).toBe(USERS.primary.email);
  });

  it('rejects profile fetch without token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects profile fetch with tampered token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.TAMPERED.SIGNATURE',
        'content-type': 'application/json',
      },
    });
    expect(res.status).toBe(401);
  });

  it('rejects profile fetch with expired/malformed token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      headers: {
        authorization: 'Bearer this.is.notvalid',
        'content-type': 'application/json',
      },
    });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION — NEW USER FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Auth: Registration', () => {
  it('registers a new unique user and returns JWT', async () => {
    const uniqueEmail = `realtest_${Date.now()}@settlr.dev`;
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Real Test User',
        email: uniqueEmail,
        password: 'TestPassword123!',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as {
      success: boolean;
      data: { accessToken: string; user: { id: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.user.id).toBeTruthy();
  });

  it('prevents registering the same email twice (400 or 409)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: USERS.primary.email, // already exists
        password: 'TestPassword123!',
      }),
    });
    // real service returns 400 for duplicate email (business rule)
    expect([400, 409]).toContain(res.status);
  });

  it('rejects registration with password shorter than 8 characters (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `short_${Date.now()}@settlr.dev`,
        password: 'short', // < 8 chars
      }),
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────────────────

describe('REAL — Auth: Token Refresh', () => {
  it('refreshes access token using real refresh token', async () => {
    if (!refreshToken) {
      const tokens = await realLogin(USERS.primary.email, USERS.primary.password);
      refreshToken = tokens.refreshToken;
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { accessToken: string } };
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
  });

  it('rejects refresh with invalid refresh token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid.refresh.token' }),
    });
    expect(res.status).toBe(401);
  });
});
