// Fraud routes — fraud check endpoint called by payment-service
import { Router } from 'express';
import { fraudCheckHandler, storeFraudSignalsHandler } from '../handlers/fraud.handler';

export const fraudRouter = Router();

// POST /fraud/check — synchronous fraud scoring
fraudRouter.post('/check', fraudCheckHandler);

// POST /fraud/signals — store signals after transaction created
fraudRouter.post('/signals', storeFraudSignalsHandler);
