// Auth routes — proxies register/login/refresh/logout to account-service
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Helper to proxy requests to account-service
async function proxy(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const url = `${config.accountServiceUrl}${path}`;
    const response = await axios({
      method,
      url,
      data: req.body,
      headers: {
        'x-trace-id': req.traceId,
        'x-user-id': req.userId || '',
        'content-type': 'application/json',
      },
      timeout: 10000,
    });
    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }
    logger.error('proxy_error', { traceId: req.traceId, path, error: (error as Error).message });
    res.status(502).json({ success: false, error: 'SERVICE_UNAVAILABLE', traceId: req.traceId });
  }
}

authRouter.post('/register', validate(registerSchema), (req, res) => proxy(req, res, 'POST', '/auth/register'));
authRouter.post('/login', validate(loginSchema), (req, res) => proxy(req, res, 'POST', '/auth/login'));
authRouter.post('/refresh', validate(refreshSchema), (req, res) => proxy(req, res, 'POST', '/auth/refresh'));
authRouter.post('/logout', authMiddleware, (req, res) => proxy(req, res, 'POST', '/auth/logout'));

// Profile routes (protected)
authRouter.get('/profile', authMiddleware, (req, res) => proxy(req, res, 'GET', '/auth/profile'));
authRouter.patch('/profile', authMiddleware, (req, res) => proxy(req, res, 'PATCH', '/auth/profile'));
