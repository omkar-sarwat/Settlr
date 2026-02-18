// JWT verification — extracts Bearer token, verifies signature, attaches userId to req
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import type { IJwtPayload } from '@settlr/types';
import { AppError, ErrorCodes } from '@settlr/types/errors';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: ErrorCodes.UNAUTHORIZED,
      message: 'Missing or invalid Authorization header',
      traceId: req.traceId,
    });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as IJwtPayload;
    req.userId = decoded.userId;
    next();
  } catch (error: unknown) {
    const code = error instanceof jwt.TokenExpiredError
      ? ErrorCodes.TOKEN_EXPIRED
      : ErrorCodes.UNAUTHORIZED;

    logger.warn('auth_failed', { traceId: req.traceId, code });

    res.status(401).json({
      success: false,
      error: code,
      message: code === ErrorCodes.TOKEN_EXPIRED ? 'Token expired' : 'Invalid token',
      traceId: req.traceId,
    });
  }
}
