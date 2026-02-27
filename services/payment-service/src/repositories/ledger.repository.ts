// Ledger repository — inserts debit/credit pairs inside a DB transaction.
import type { Knex } from 'knex';
import { db } from '@settlr/database';
import type { ILedgerEntryRow } from '@settlr/types';

export const ledgerRepository = {
  // Insert both debit and credit entries atomically within the DB transaction
  async createPair(
    trx: Knex.Transaction,
    entries: Array<{
      transactionId: string;
      accountId: string;
      entryType: 'debit' | 'credit';
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
    }>
  ): Promise<ILedgerEntryRow[]> {
    const rows = entries.map((e) => ({
      transaction_id: e.transactionId,
      account_id: e.accountId,
      entry_type: e.entryType,
      amount: e.amount,
      balance_before: e.balanceBefore,
      balance_after: e.balanceAfter,
    }));
    return trx('ledger_entries').insert(rows).returning('*');
  },

  async findByTransactionId(transactionId: string): Promise<ILedgerEntryRow[]> {
    return db('ledger_entries')
      .where({ transaction_id: transactionId })
      .orderBy('created_at', 'asc');
  },
};
