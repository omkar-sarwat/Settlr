// Request logging — logs every request with method, path, statusCode, duration, traceId
import { Request, Response, NextFunction } from 'express';
import { logger } from '@settlr/logger';

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture response finish event to log after the response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('http_request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      traceId: req.traceId,
    });
  });

  next();
}
