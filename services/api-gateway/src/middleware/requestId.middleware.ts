// Attaches a unique traceId (UUID) to every request for end-to-end correlation across services
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.traceId = req.headers['x-trace-id'] as string || randomUUID();
  next();
}
