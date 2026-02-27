// Fraud repository — read fraud signal rows for transaction detail views.
import { db } from '@settlr/database';
import type { IFraudSignalRow } from '@settlr/types';

export const fraudRepository = {
  async findSignalsByTransactionId(transactionId: string): Promise<IFraudSignalRow[]> {
    return db('fraud_signals')
      .where({ transaction_id: transactionId })
      .orderBy('created_at', 'asc');
  },
};
