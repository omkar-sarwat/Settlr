// Webhook routes — CRUD for endpoints + delivery history
import { Router } from 'express';
import { internalAuth } from '../middleware/internalAuth.middleware';
import {
  registerEndpointHandler,
  listEndpointsHandler,
  deleteEndpointHandler,
  getDeliveriesHandler,
} from '../handlers/webhook.handler';

export const webhookRouter = Router();

webhookRouter.use(internalAuth);

webhookRouter.post('/', registerEndpointHandler);
webhookRouter.get('/', listEndpointsHandler);
webhookRouter.delete('/:endpointId', deleteEndpointHandler);
webhookRouter.get('/:endpointId/deliveries', getDeliveriesHandler);
