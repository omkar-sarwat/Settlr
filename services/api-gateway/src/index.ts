// API Gateway — Express bootstrap, middleware registration, route mounting, health checks, WebSocket
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { connectRedis } from '@settlr/redis';
import { AppError } from '@settlr/types/errors';

import { requestIdMiddleware } from './middleware/requestId.middleware';
import { requestLogMiddleware } from './middleware/requestLog.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { authRouter } from './routes/auth.routes';
import { accountRouter } from './routes/account.routes';
import { paymentRouter } from './routes/payment.routes';
import { transactionRouter } from './routes/transaction.routes';
import { webhookRouter } from './routes/webhook.routes';
import { adminRouter } from './routes/admin.routes';

const app = express();

// ── Global middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogMiddleware);
app.use(rateLimitMiddleware);

// ── System routes (no auth)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.get('/ready', async (_req: Request, res: Response) => {
  const redisOk = await connectRedis().catch(() => false);
  res.status(redisOk ? 200 : 503).json({ redis: redisOk ? 'ok' : 'down' });
});

// ── API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/webhooks', webhookRouter);

// ── Global error handler (last middleware)
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const traceId = req.traceId || 'unknown';

  if (error instanceof AppError && error.isOperational) {
    logger.warn('operational_error', { traceId, code: error.code, message: error.message });
    res.status(error.statusCode).json({
      success: false, error: error.code, message: error.message, traceId,
      ...(error.data ? { data: error.data } : {}),
    });
    return;
  }

  logger.error('unexpected_error', { traceId, error: error.message, stack: error.stack });
  res.status(500).json({
    success: false, error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', traceId,
  });
});

// ── WebSocket — broadcast real-time events to connected clients
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  logger.info('ws_connected', { clients: clients.size });

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('ws_disconnected', { clients: clients.size });
  });

  ws.on('error', (err) => {
    logger.error('ws_error', { error: err.message });
    clients.delete(ws);
  });

  // Send a welcome message so the client knows it's connected
  ws.send(JSON.stringify({ type: 'system_status', data: { status: 'connected' } }));
});

/** Broadcast a message to all connected WebSocket clients */
export function broadcast(message: { type: string; data: unknown }) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ── Start server
async function start(): Promise<void> {
  const redisOk = await connectRedis();
  if (!redisOk) {
    logger.error('startup_failed', { reason: 'Redis connection failed' });
    process.exit(1);
  }

  const port = parseInt(process.env.API_GATEWAY_PORT || '3000', 10);
  server.listen(port, () => {
    logger.info('server_started', { service: 'api-gateway', port, ws: '/ws' });
  });
}

start();

export { app };
