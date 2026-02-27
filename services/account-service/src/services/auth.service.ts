// Auth service — register, login, refresh token, logout. bcrypt + JWT.
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { redis } from '@settlr/redis';
import { authRepository } from '../repositories/auth.repository';
import { toCamelCase } from '@settlr/types';
import type { IUser, IResult, IAuthTokens, IJwtPayload } from '@settlr/types';
import { AppError, ErrorCodes } from '@settlr/types/errors';
import { randomUUID } from 'crypto';

// Generate both access and refresh tokens for a user
function generateTokens(user: IUser): IAuthTokens {
  const payload: IJwtPayload = { userId: user.id, email: user.email };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { ...payload, tokenId: randomUUID() },
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiresIn } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

export const authService = {
  // Register a new user — hash password with bcrypt (salt >= 12)
  async register(email: string, password: string, phone?: string, name?: string): Promise<IResult<IAuthTokens & {
    user: Omit<IUser, 'passwordHash'>;
    account: { id: string; balance: number; currency: string };
  }>> {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
    const row = await authRepository.createUser(email, passwordHash, phone, name);
    const user = toCamelCase(row as unknown as Record<string, unknown>) as unknown as IUser;

    const tokens = generateTokens(user);

    // Store refresh token in Redis so we can invalidate on logout
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

    logger.info('user_registered', { userId: user.id, email });

    const { passwordHash: _pw, ...safeUser } = user;
    const account = await authRepository.getOrCreatePrimaryAccount(user.id);
    return {
      success: true,
      statusCode: 201,
      data: { ...tokens, user: safeUser, account },
    };
  },

  // Login — verify email + password, return tokens
  async login(email: string, password: string): Promise<IResult<IAuthTokens & {
    user: Omit<IUser, 'passwordHash'>;
    account: { id: string; balance: number; currency: string };
  }>> {
    const row = await authRepository.findByEmail(email);
    if (!row) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const user = toCamelCase(row as unknown as Record<string, unknown> as unknown as Record<string, unknown>) as unknown as IUser;

    if (!user.isActive) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Account is deactivated', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const tokens = generateTokens(user);
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

    logger.info('user_logged_in', { userId: user.id });

    const { passwordHash: _pw, ...safeUser } = user;
    const account = await authRepository.getOrCreatePrimaryAccount(user.id);
    return { success: true, statusCode: 200, data: { ...tokens, user: safeUser, account } };
  },

  // Refresh — exchange refresh token for new access + refresh tokens
  async refresh(refreshToken: string): Promise<IResult<IAuthTokens>> {
    let decoded: IJwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret) as IJwtPayload;
    } catch {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Invalid or expired refresh token', 401);
    }

    // Check if token was revoked (logout)
    const stored = await redis.get(`refresh:${decoded.userId}`);
    if (!stored || stored !== refreshToken) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Refresh token has been revoked', 401);
    }

    const row = await authRepository.findById(decoded.userId);
    if (!row || !row.is_active) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'User not found or inactive', 401);
    }

    const user = toCamelCase(row as unknown as Record<string, unknown>) as unknown as IUser;
    const tokens = generateTokens(user);
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

    logger.info('token_refreshed', { userId: user.id });
    return { success: true, statusCode: 200, data: tokens };
  },

  // Logout — invalidate the refresh token in Redis
  async logout(userId: string): Promise<IResult<null>> {
    await redis.del(`refresh:${userId}`);
    logger.info('user_logged_out', { userId });
    return { success: true, statusCode: 200, message: 'Logged out successfully' };
  },

  // Get user profile by ID
  async getProfile(userId: string): Promise<IResult<Omit<IUser, 'passwordHash'>>> {
    const row = await authRepository.findById(userId);
    if (!row) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'User not found', 404);
    }
    const user = toCamelCase(row as unknown as Record<string, unknown>) as unknown as IUser;
    const { passwordHash: _pw, ...safeUser } = user;
    return { success: true, statusCode: 200, data: safeUser };
  },

  // Update user profile (name, phone)
  async updateProfile(userId: string, updates: { name?: string; phone?: string }): Promise<IResult<Omit<IUser, 'passwordHash'>>> {
    const row = await authRepository.updateProfile(userId, updates);
    if (!row) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'User not found', 404);
    }
    const user = toCamelCase(row as unknown as Record<string, unknown>) as unknown as IUser;
    const { passwordHash: _pw, ...safeUser } = user;
    logger.info('profile_updated', { userId, updates });
    return { success: true, statusCode: 200, data: safeUser };
  },
};
