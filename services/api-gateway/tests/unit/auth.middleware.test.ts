// Unit tests for auth.middleware.ts — JWT verification, missing token, expired token.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('jsonwebtoken', () => {
  class TokenExpiredError extends Error {
    name = 'TokenExpiredError';
    constructor() { super('jwt expired'); }
  }
  return {
    default: {
      verify: vi.fn(),
      TokenExpiredError,
    },
    TokenExpiredError,
  };
});

vi.mock('@settlr/config', () => ({
  config: { jwtSecret: 'test-secret' },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/types/errors', () => ({
  AppError: class extends Error {
    code: string; statusCode: number;
    constructor(code: string, message: string, statusCode = 500) {
      super(message); this.code = code; this.statusCode = statusCode;
    }
  },
  ErrorCodes: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  },
}));

import { authMiddleware } from '../../src/middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// Helper to create mock req/res/next
function createMocks(authHeader?: string) {
  const req = {
    headers: { authorization: authHeader },
    traceId: 'trace-test-001',
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('AuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches userId to req and calls next() when token is valid', () => {
    const { req, res, next } = createMocks('Bearer valid-token-123');
    (jwt.verify as Mock).mockReturnValue({ userId: 'user-001', email: 'test@settlr.com' });

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token-123', 'test-secret');
    expect(req.userId).toBe('user-001');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is missing', () => {
    const { req, res, next } = createMocks(undefined);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with "Bearer "', () => {
    const { req, res, next } = createMocks('Basic dXNlcjpwYXNz');

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with TOKEN_EXPIRED when token is expired', () => {
    const { req, res, next } = createMocks('Bearer expired-token');
    const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
    (jwt.verify as Mock).mockImplementation(() => { throw expiredError; });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token expired',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with UNAUTHORIZED when token signature is invalid', () => {
    const { req, res, next } = createMocks('Bearer tampered-token');
    (jwt.verify as Mock).mockImplementation(() => { throw new Error('invalid signature'); });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid token',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('extracts only the token part after "Bearer "', () => {
    const { req, res, next } = createMocks('Bearer my.jwt.token');
    (jwt.verify as Mock).mockReturnValue({ userId: 'user-002', email: 'a@b.com' });

    authMiddleware(req, res, next);

    // Verify it passed 'my.jwt.token' (7 chars after "Bearer ")
    expect(jwt.verify).toHaveBeenCalledWith('my.jwt.token', 'test-secret');
  });
});
