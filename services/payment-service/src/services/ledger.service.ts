// Ledger service — creates exactly 2 ledger entries per transfer (1 debit + 1 credit). Double-entry bookkeeping.
import type { Knex } from 'knex';
import type { ILedgerParams } from '@settlr/types';
import { ledgerRepository } from '../repositories/ledger.repository';

export const ledgerService = {
  // Insert both debit (sender) and credit (recipient) inside the same DB transaction
  async createEntries(trx: Knex.Transaction, params: ILedgerParams): Promise<void> {
    await ledgerRepository.createPair(trx, [
      {
        transactionId: params.transactionId,
        accountId: params.fromAccountId,
        entryType: 'debit',
        amount: params.amount,
        balanceBefore: params.fromBalanceBefore,
        balanceAfter: params.fromBalanceAfter,
      },
      {
        transactionId: params.transactionId,
        accountId: params.toAccountId,
        entryType: 'credit',
        amount: params.amount,
        balanceBefore: params.toBalanceBefore,
        balanceAfter: params.toBalanceAfter,
      },
    ]);
  },
};
