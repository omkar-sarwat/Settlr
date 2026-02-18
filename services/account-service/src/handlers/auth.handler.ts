// Auth handler — HTTP layer for register, login, refresh, logout. No business logic.
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import type { IApiResponse } from '@settlr/types';

function respond<T>(res: Response, statusCode: number, payload: { success: boolean; data?: T; error?: string; message?: string }, traceId: string): void {
  const body: IApiResponse<T> = { ...payload, traceId };
  res.status(statusCode).json(body);
}

// POST /register — Create user + return tokens
export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.register(email, password, phone, name);
    respond(res, result.statusCode ?? 201, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// POST /login — Verify credentials, return tokens
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// POST /refresh — Exchange refresh token for new pair
export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    respond(res, result.statusCode ?? 200, { success: true, data: result.data }, req.traceId!);
  } catch (err) {
    next(err);
  }
}

// POST /logout — Invalidate refresh token
export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.logout(req.userId!);
    respond(res, result.statusCode ?? 200, { success: true, message: result.message }, req.traceId!);
  } catch (err) {
    next(err);
  }
}
