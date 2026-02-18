// Zod request validation — validates req.body against schema, returns 400 with details on failure
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ErrorCodes } from '@settlr/types/errors';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: result.error.errors,
        traceId: req.traceId,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
