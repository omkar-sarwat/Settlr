// Unit tests for rateLimit.middleware.ts — sliding window rate limiting, headers, fail-open
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@settlr/redis', () => ({
  slidingWindowRateLimit: vi.fn(),
}));

vi.mock('@settlr/config', () => ({
  config: {
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
  },
}));

vi.mock('@settlr/types/errors', () => ({
  ErrorCodes: { RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED' },
}));

import { rateLimitMiddleware } from '../../src/middleware/rateLimit.middleware';
import { slidingWindowRateLimit } from '@settlr/redis';
import type { Request, Response, NextFunction } from 'express';

// ── Helpers ────────────────────────────────────────────────────────────────
function createMockReq(ip = '192.168.1.1'): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as never,
    traceId: 'trace-123',
  };
}

function createMockRes(): Partial<Response> & { _headers: Record<string, unknown>; _status: number; _body: unknown } {
  const res: Record<string, unknown> = {
    _headers: {} as Record<string, unknown>,
    _status: 200,
    _body: null,
  };
  res.setHeader = vi.fn((key: string, val: unknown) => {
    (res._headers as Record<string, unknown>)[key] = val;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  });
  return res as Partial<Response> & { _headers: Record<string, unknown>; _status: number; _body: unknown };
}

describe('rateLimitMiddleware', () => {
  let req: Partial<Request>;
  let res: ReturnType<typeof createMockRes>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
    next = vi.fn() as unknown as NextFunction;
  });

  it('should allow request when under rate limit', async () => {
    (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 99 });

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    // Wait for the promise to resolve
    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(res._headers['X-RateLimit-Limit']).toBe(100);
    expect(res._headers['X-RateLimit-Remaining']).toBe(99);
  });

  it('should return 429 when rate limit is exceeded', async () => {
    (slidingWindowRateLimit as Mock).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 45,
    });

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    expect(res._status).toBe(429);
    expect(res._headers['Retry-After']).toBe(45);
    expect(next).not.toHaveBeenCalled();
  });

  it('should set default Retry-After of 60 when retryAfterSeconds is undefined', async () => {
    (slidingWindowRateLimit as Mock).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: undefined,
    });

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    expect(res._headers['Retry-After']).toBe(60);
    expect(res._status).toBe(429);
  });

  it('should include error code and traceId in 429 response', async () => {
    (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 30 });

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    const body = (res.json as Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.traceId).toBe('trace-123');
  });

  it('should fail-open (call next) when Redis is down', async () => {
    (slidingWindowRateLimit as Mock).mockRejectedValue(new Error('Redis connection refused'));

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(res.status).not.toHaveBeenCalled();
  });

  it('should use req.ip for rate limiting key', async () => {
    req = createMockReq('10.0.0.5');
    (slidingWindowRateLimit as Mock).mockResolvedValue({ allowed: true, remaining: 50 });

    rateLimitMiddleware(req as Request, res as unknown as Response, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(slidingWindowRateLimit).toHaveBeenCalledWith('10.0.0.5', 60000, 100);
  });
});
