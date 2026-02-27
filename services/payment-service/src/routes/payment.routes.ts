// Payment routes — initiate payment, get transaction details, list transactions, metrics
import { Router } from 'express';
import { internalAuth } from '../middleware/internalAuth.middleware';
import { initiatePaymentHandler, getTransactionHandler, getTransactionDetailsHandler, listTransactionsHandler, getMetricsHandler, getDashboardStatsHandler } from '../handlers/payment.handler';

export const paymentRouter = Router();

paymentRouter.use(internalAuth);

// POST /payments — Initiate transfer (Idempotency-Key required)
paymentRouter.post('/', initiatePaymentHandler);

// GET /payments/metrics — Aggregate system metrics (admin dashboard)
paymentRouter.get('/metrics', getMetricsHandler);

// GET /payments/dashboard-stats — Per-account today stats (user dashboard)
paymentRouter.get('/dashboard-stats', getDashboardStatsHandler);

// GET /payments — List transactions with pagination
paymentRouter.get('/', listTransactionsHandler);

// GET /payments/transactions/:transactionId/details — combined detail payload
paymentRouter.get('/transactions/:transactionId/details', getTransactionDetailsHandler);

// GET /payments/:transactionId — Transaction details with fraud signals
paymentRouter.get('/:transactionId', getTransactionHandler);
