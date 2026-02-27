/**
 * Real Integration Test Helpers
 * NO MOCKS — hits the actual running services via HTTP.
 * Make sure `docker-compose up` or `start-all.ps1` is running before executing these tests.
 */

export const BASE_URL = 'http://localhost:3000';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Account {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

/**
 * Login with real credentials to get a real JWT token.
 */
export async function realLogin(email: string, password: string): Promise<AuthTokens & { userId: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { data: AuthTokens & { user: { id: string } } };
  return { ...data.data, userId: data.data.user.id };
}

/**
 * Make an authenticated GET request to the real API.
 */
export async function apiGet(path: string, token: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
}

/**
 * Make an authenticated POST request to the real API.
 */
export async function apiPost(
  path: string,
  token: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Make an authenticated DELETE request to the real API.
 */
export async function apiDelete(path: string, token: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
}

/**
 * Generate a UUID v4 (for idempotency keys).
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Sleep for ms milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Known seeded test users */
export const USERS = {
  primary: { email: 'test@settlr.dev', password: 'password123' },
  secondary: { email: 'alice@settlr.dev', password: 'password123' },
  third: { email: 'bob@settlr.dev', password: 'password123' },
};

/** Known seeded account IDs */
export const KNOWN_ACCOUNTS = {
  /** test@settlr.dev — funded with ~₹25L */
  sender: '103547ee-f866-49c9-a0ef-d10a5d476383',
  /** Secondary recipient account */
  recipient: '1ebf3611-58a7-46ec-bac9-c1185ab31f4d',
};
