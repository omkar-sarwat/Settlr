// Payment routes — initiate payment + get transaction details
import { Router } from 'express';
import { internalAuth } from '../middleware/internalAuth.middleware';
import { initiatePaymentHandler, getTransactionHandler } from '../handlers/payment.handler';

export const paymentRouter = Router();

paymentRouter.use(internalAuth);

// POST /payments — Initiate transfer (Idempotency-Key required)
paymentRouter.post('/', initiatePaymentHandler);

// GET /payments/:transactionId — Transaction details with fraud signals
paymentRouter.get('/:transactionId', getTransactionHandler);
