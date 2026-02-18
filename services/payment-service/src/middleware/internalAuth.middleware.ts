// Internal auth — extracts x-user-id and x-trace-id set by api-gateway
import type { Request, Response, NextFunction } from 'express';
import { ErrorCodes } from '@settlr/types/errors';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  const traceId = req.headers['x-trace-id'] as string | undefined;

  if (traceId) req.traceId = traceId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: ErrorCodes.UNAUTHORIZED,
      message: 'Missing x-user-id header',
      traceId: req.traceId,
    });
    return;
  }

  req.userId = userId;
  next();
}
