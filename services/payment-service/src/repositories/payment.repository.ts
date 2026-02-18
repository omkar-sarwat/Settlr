// Payment repository — SQL queries for the transactions table. Insert, update status, find by id/idempotency_key.
import { db } from '@settlr/database';
import type { Knex } from 'knex';
import type { ITransactionRow } from '@settlr/types';

export const paymentRepository = {
  // Create a new transaction row inside the given DB transaction
  async create(
    trx: Knex.Transaction,
    data: {
      idempotencyKey: string;
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      currency: string;
      status: string;
      fraudScore: number;
      fraudAction: string;
      description?: string;
    }
  ): Promise<ITransactionRow> {
    const [row] = await trx('transactions')
      .insert({
        idempotency_key: data.idempotencyKey,
        from_account_id: data.fromAccountId,
        to_account_id: data.toAccountId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        fraud_score: data.fraudScore,
        fraud_action: data.fraudAction,
        metadata: data.description ? { description: data.description } : {},
      })
      .returning('*');
    return row;
  },

  // Find a transaction by its UUID
  async findById(transactionId: string): Promise<ITransactionRow | undefined> {
    return db('transactions').where({ id: transactionId }).first();
  },

  // Find a transaction by idempotency key (for cache checks)
  async findByIdempotencyKey(key: string): Promise<ITransactionRow | undefined> {
    return db('transactions').where({ idempotency_key: key }).first();
  },

  // Update transaction status (e.g. to 'failed')
  async updateStatus(
    trx: Knex.Transaction,
    transactionId: string,
    status: string,
    failureReason?: string
  ): Promise<void> {
    await trx('transactions')
      .where({ id: transactionId })
      .update({ status, failure_reason: failureReason, updated_at: new Date() });
  },

  // Lock sender account row inside DB transaction (SELECT ... FOR UPDATE)
  async lockAccount(trx: Knex.Transaction, accountId: string) {
    return trx('accounts')
      .where({ id: accountId, status: 'active' })
      .forUpdate()
      .first();
  },

  // Update account balance with optimistic lock (version check)
  async updateBalance(
    trx: Knex.Transaction,
    accountId: string,
    newBalance: number,
    currentVersion: number
  ): Promise<number> {
    return trx('accounts')
      .where({ id: accountId, version: currentVersion })
      .update({
        balance: newBalance,
        version: currentVersion + 1,
        updated_at: new Date(),
      });
  },

  // Credit recipient — no optimistic lock needed since we hold row-level FOR UPDATE already
  async creditAccount(
    trx: Knex.Transaction,
    accountId: string,
    newBalance: number,
    currentVersion: number
  ): Promise<void> {
    await trx('accounts')
      .where({ id: accountId })
      .update({
        balance: newBalance,
        version: currentVersion + 1,
        updated_at: new Date(),
      });
  },

  // Get transaction with fraud signals joined
  async findByIdWithSignals(transactionId: string): Promise<{ transaction: ITransactionRow; signals: unknown[] } | undefined> {
    const transaction = await db('transactions').where({ id: transactionId }).first();
    if (!transaction) return undefined;

    const signals = await db('fraud_signals').where({ transaction_id: transactionId });
    return { transaction, signals };
  },
};
