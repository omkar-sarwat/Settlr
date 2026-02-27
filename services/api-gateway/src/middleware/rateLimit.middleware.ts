// Redis sliding window rate limiter — 100 requests per minute per user (per-IP fallback for unauthenticated)
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { slidingWindowRateLimit } from '@settlr/redis';
import { config } from '@settlr/config';
import { ErrorCodes } from '@settlr/types/errors';
import type { IJwtPayload } from '@settlr/types';

/**
 * Determines the rate-limit key for a request.
 * If the request carries a valid JWT, rate-limit per userId.
 * Otherwise fall back to per-IP.
 */
function getRateLimitKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), config.jwtSecret) as IJwtPayload;
      if (decoded.userId) return `user:${decoded.userId}`;
    } catch {
      // Token invalid/expired — fall through to IP-based
    }
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = getRateLimitKey(req);

  slidingWindowRateLimit(key, config.rateLimitWindowMs, config.rateLimitMaxRequests)
    .then((result) => {
      res.setHeader('X-RateLimit-Limit', config.rateLimitMaxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfterSeconds || 60);
        res.status(429).json({
          success: false,
          error: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests. Please try again later.',
          traceId: req.traceId,
        });
        return;
      }

      next();
    })
    .catch(() => {
      // If Redis is down, allow the request through (fail-open)
      next();
    });
}
