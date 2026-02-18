// Webhook handler — HTTP layer for CRUD on endpoints and delivery history.
import type { Request, Response, NextFunction } from 'express';
import { webhookRepository } from '../repositories/webhook.repository';
import { toCamelCase } from '@settlr/types';
import type { IApiResponse } from '@settlr/types';
import { AppError, ErrorCodes } from '@settlr/types/errors';

function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

// POST /webhooks — Register a new webhook endpoint
export async function registerEndpointHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url, events } = req.body;
    const row = await webhookRepository.createEndpoint(req.userId!, url, events);
    const endpoint = toCamelCase(row as unknown as Record<string, unknown>);
    // Secret is only shown once, on creation
    respond(res, 201, { success: true, data: endpoint }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /webhooks — List all endpoints for the authenticated user
export async function listEndpointsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await webhookRepository.findByUserId(req.userId!);
    // Strip secret from listing — only shown on creation
    const endpoints = rows.map((row) => {
      const obj = toCamelCase(row as unknown as Record<string, unknown>);
      delete obj.secret;
      return obj;
    });
    respond(res, 200, { success: true, data: endpoints }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// DELETE /webhooks/:endpointId — Deactivate a webhook endpoint
export async function deleteEndpointHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await webhookRepository.deactivate(req.params.endpointId, req.userId!);
    if (!deleted) {
      throw AppError.notFound('Webhook endpoint', req.params.endpointId);
    }
    respond(res, 200, { success: true, message: 'Webhook endpoint deleted' }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// GET /webhooks/:endpointId/deliveries — Delivery history for an endpoint
export async function getDeliveriesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // Verify endpoint belongs to user
    const endpoint = await webhookRepository.findById(req.params.endpointId);
    if (!endpoint || endpoint.user_id !== req.userId!) {
      throw AppError.notFound('Webhook endpoint', req.params.endpointId);
    }

    const { items, total } = await webhookRepository.getDeliveries(req.params.endpointId, page, limit);
    const deliveries = items.map((row) => toCamelCase(row as unknown as Record<string, unknown>));
    const totalPages = Math.ceil(total / limit);

    respond(res, 200, {
      success: true,
      data: { items: deliveries, total, page, limit, totalPages, hasMore: page < totalPages },
    }, req.traceId!);
  } catch (err) {
    next(err);
  }
}
