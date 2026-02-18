// Unit tests for auth.service.ts — register, login, refresh, logout with bcrypt + JWT.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('random-uuid-001'),
}));

vi.mock('@settlr/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    bcryptSaltRounds: 12,
  },
}));

vi.mock('@settlr/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@settlr/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
}));

vi.mock('@settlr/types', () => ({
  toCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
}));

vi.mock('@settlr/types/errors', () => {
  class AppError extends Error {
    code: string; statusCode: number; isOperational: boolean;
    constructor(code: string, message: string, statusCode = 500) {
      super(message); this.code = code; this.statusCode = statusCode; this.isOperational = true;
    }
  }
  return {
    AppError,
    ErrorCodes: {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
      UNAUTHORIZED: 'UNAUTHORIZED',
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    },
  };
});

vi.mock('../../src/repositories/auth.repository', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    createUser: vi.fn(),
  },
}));

import { authService } from '../../src/services/auth.service';
import { authRepository } from '../../src/repositories/auth.repository';
import { redis } from '@settlr/redis';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const mockUserRow = {
  id: 'user-001',
  email: 'test@settlr.com',
  password_hash: '$2b$12$hashedpassword',
  phone: '+919876543210',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (jwt.sign as Mock).mockReturnValueOnce('access-token-001').mockReturnValueOnce('refresh-token-001');
  });

  describe('register', () => {
    it('creates user, hashes password, and returns tokens', async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('$2b$12$newhash');
      (authRepository.createUser as Mock).mockResolvedValue(mockUserRow);
      (redis.setex as Mock).mockResolvedValue('OK');

      const result = await authService.register('test@settlr.com', 'StrongP@ss1');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data?.accessToken).toBe('access-token-001');
      expect(result.data?.refreshToken).toBe('refresh-token-001');
      expect(result.data?.user).not.toHaveProperty('passwordHash');

      // Password hashed with bcrypt salt rounds = 12
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongP@ss1', 12);

      // Refresh token stored in Redis with 7-day TTL
      expect(redis.setex).toHaveBeenCalledWith(
        'refresh:user-001',
        604800, // 7 * 24 * 60 * 60
        'refresh-token-001'
      );
    });

    it('throws when email already exists', async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(mockUserRow);

      await expect(
        authService.register('test@settlr.com', 'StrongP@ss1')
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('returns tokens when credentials are valid', async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(mockUserRow);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (redis.setex as Mock).mockResolvedValue('OK');

      const result = await authService.login('test@settlr.com', 'StrongP@ss1');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data?.accessToken).toBeDefined();
    });

    it('throws when email is not found', async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(null);

      await expect(
        authService.login('nobody@settlr.com', 'pass')
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws when password is wrong', async () => {
      (authRepository.findByEmail as Mock).mockResolvedValue(mockUserRow);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@settlr.com', 'WrongP@ss')
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws when account is deactivated', async () => {
      const inactiveRow = { ...mockUserRow, is_active: false };
      (authRepository.findByEmail as Mock).mockResolvedValue(inactiveRow);

      await expect(
        authService.login('test@settlr.com', 'StrongP@ss1')
      ).rejects.toThrow('Account is deactivated');
    });
  });

  describe('refresh', () => {
    it('returns new tokens when refresh token is valid and stored', async () => {
      const decoded = { userId: 'user-001', email: 'test@settlr.com' };
      (jwt.verify as Mock).mockReturnValue(decoded);
      (redis.get as Mock).mockResolvedValue('refresh-token-valid');
      (authRepository.findById as Mock).mockResolvedValue(mockUserRow);
      (redis.setex as Mock).mockResolvedValue('OK');

      // Reset jwt.sign for this test
      (jwt.sign as Mock).mockReset();
      (jwt.sign as Mock).mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

      const result = await authService.refresh('refresh-token-valid');

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe('new-access');
    });

    it('throws when refresh token is expired/invalid', async () => {
      (jwt.verify as Mock).mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(
        authService.refresh('expired-token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('throws when refresh token has been revoked (logout)', async () => {
      (jwt.verify as Mock).mockReturnValue({ userId: 'user-001', email: 'test@settlr.com' });
      (redis.get as Mock).mockResolvedValue('different-token');

      await expect(
        authService.refresh('revoked-token')
      ).rejects.toThrow('Refresh token has been revoked');
    });
  });

  describe('logout', () => {
    it('deletes refresh token from Redis', async () => {
      (redis.del as Mock).mockResolvedValue(1);

      const result = await authService.logout('user-001');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(redis.del).toHaveBeenCalledWith('refresh:user-001');
    });
  });
});
