// Redis sliding window rate limiter — returns 429 when IP exceeds max requests per window
import { Request, Response, NextFunction } from 'express';
import { slidingWindowRateLimit } from '@settlr/redis';
import { config } from '@settlr/config';
import { ErrorCodes } from '@settlr/types/errors';

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  slidingWindowRateLimit(ip, config.rateLimitWindowMs, config.rateLimitMaxRequests)
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
