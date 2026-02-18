// Account routes — all protected, require x-user-id header from api-gateway
import { Router } from 'express';
import { internalAuth } from '../middleware/internalAuth.middleware';
import {
  createAccountHandler,
  listAccountsHandler,
  lookupAccountHandler,
  getWeeklyStatsHandler,
  getAccountHandler,
  getTransactionsHandler,
  getLedgerHandler,
} from '../handlers/account.handler';

export const accountRouter = Router();

// All account routes require authenticated user
accountRouter.use(internalAuth);

accountRouter.post('/', createAccountHandler);
accountRouter.get('/', listAccountsHandler);
accountRouter.get('/lookup', lookupAccountHandler);
accountRouter.get('/stats/weekly', getWeeklyStatsHandler);
accountRouter.get('/:accountId', getAccountHandler);
accountRouter.get('/:accountId/transactions', getTransactionsHandler);
accountRouter.get('/:accountId/ledger', getLedgerHandler);
