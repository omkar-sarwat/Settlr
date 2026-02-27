// THE CORE — Atomic transfer with all 17 steps:
//   idempotency → distributed lock → fraud check → DB transaction (row lock → balance check →
//   optimistic lock → credit → ledger → transaction record → commit) → cache → Kafka → return
import axios from 'axios';
import { db } from '@settlr/database';
import { redis, acquireAccountLocks, releaseAllLocks } from '@settlr/redis';
import { publishEvent, KafkaTopics } from '@settlr/kafka';
import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import { toCamelCase } from '@settlr/types';
import type { IInitiatePaymentParams, ITransaction, IResult, IFraudResult, IAccountRow } from '@settlr/types';
import { AppError, ErrorCodes } from '@settlr/types/errors';
import { idempotencyService } from './idempotency.service';
import { ledgerService } from './ledger.service';
import { ledgerRepository } from '../repositories/ledger.repository';
import { fraudRepository } from '../repositories/fraud.repository';
import { paymentRepository } from '../repositories/payment.repository';

// Fraud check — calls fraud-service via HTTP for synchronous response
async function runFraudCheck(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  accountCreatedAt: string;
  traceId: string;
}): Promise<IFraudResult> {
  try {
    const response = await axios.post<{ success: boolean; data: IFraudResult }>(
      `${config.fraudServiceUrl}/fraud/check`,
      {
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        accountCreatedAt: params.accountCreatedAt,
        traceId: params.traceId,
      },
      {
        headers: { 'x-trace-id': params.traceId, 'content-type': 'application/json' },
        timeout: 5000,
      }
    );
    return response.data.data;
  } catch (error: unknown) {
    // If fraud service is down, default to approve with score 0 (fail-open)
    logger.error('fraud_check_failed', {
      traceId: params.traceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { score: 0, action: 'approve', signals: [] };
  }
}

export const paymentService = {
  // The 17-step atomic transfer
  async initiatePayment(params: IInitiatePaymentParams): Promise<IResult<ITransaction>> {

    // ── STEP 1: Idempotency Check ──────────────────────────────────────────
    // Check Redis BEFORE anything else. If key exists, return cached response.
    const cached = await idempotencyService.get(params.idempotencyKey);
    if (cached) {
      logger.info('idempotency_cache_hit', { key: params.idempotencyKey, traceId: params.traceId });
      return { success: true, data: cached, fromCache: true, statusCode: 200 };
    }

    // ── STEP 1b: Validate amount bounds ────────────────────────────────────
    if (params.amount < config.minTransferAmountPaise) {
      throw AppError.validation(`Minimum transfer is ${config.minTransferAmountPaise} paise`);
    }
    if (params.amount > config.maxTransferAmountPaise) {
      throw AppError.validation(`Maximum transfer is ${config.maxTransferAmountPaise} paise`);
    }
    if (params.fromAccountId === params.toAccountId) {
      throw AppError.validation('Cannot transfer to the same account');
    }

    // ── STEP 2: Acquire Distributed Locks ─────────────────────────────────
    // Sort UUIDs alphabetically BEFORE locking to prevent deadlocks.
    const { acquired, lockKeys } = await acquireAccountLocks(
      params.fromAccountId,
      params.toAccountId,
      10 // 10 second TTL
    );

    if (!acquired) {
      throw AppError.accountLocked();
    }

    try {
      // ── STEP 3: Fraud Check ─────────────────────────────────────────────
      // Synchronous HTTP call to fraud-service. Runs 6 rules in parallel.
      // PERF: Load both accounts in parallel before entering the DB transaction.
      // Inside the transaction they are re-fetched with SELECT FOR UPDATE NOWAIT (row locks).
      // This pre-load adds early existence validation and saves ~50ms vs sequential.
      const [senderAccount, recipientAccount] = await Promise.all([
        db('accounts').where({ id: params.fromAccountId }).first(),
        db('accounts').where({ id: params.toAccountId }).first(),
      ]);

      if (!senderAccount) {
        throw AppError.notFound('Sender account', params.fromAccountId);
      }
      if (!recipientAccount) {
        throw new AppError(ErrorCodes.RECIPIENT_NOT_FOUND, `Recipient account '${params.toAccountId}' not found`, 404);
      }

      const fraudResult = await runFraudCheck({
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        accountCreatedAt: senderAccount.created_at,
        traceId: params.traceId,
      });

      logger.info('fraud_check_completed', {
        traceId: params.traceId,
        score: fraudResult.score,
        action: fraudResult.action,
        signalCount: fraudResult.signals.length,
      });

      // ── STEP 4: Reject High-Risk Transactions ───────────────────────────
      // Both "challenge" (score 60-79) and "decline" (score ≥80) block the payment.
      if (fraudResult.action === 'decline' || fraudResult.action === 'challenge') {
        await publishEvent(KafkaTopics.PAYMENT_FRAUD_BLOCKED, {
          traceId: params.traceId,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          currency: params.currency,
          description: params.description ?? null,
          fraudScore: fraudResult.score,
          fraudAction: fraudResult.action,
          signals: fraudResult.signals.map((s) => s.ruleName),
        }, params.traceId);

        throw AppError.fraudBlocked(fraudResult.score);
      }

      // ── STEPS 5–13: Atomic Database Transaction ─────────────────────────
      let retries = 0;
      let transactionRow: unknown;

      while (retries < 3) {
        try {
          transactionRow = await db.transaction(async (trx) => {

            // ── STEP 6: Lock Rows in Database (SELECT ... FOR UPDATE NOWAIT) ────────
            const fromAccount = await paymentRepository.lockAccount(trx, params.fromAccountId) as IAccountRow | undefined;
            if (!fromAccount) {
              throw AppError.notFound('Sender account', params.fromAccountId);
            }
            if (fromAccount.status !== 'active') {
              throw new AppError(ErrorCodes.ACCOUNT_FROZEN, `Sender account '${params.fromAccountId}' is ${fromAccount.status}`, 403);
            }
            // PostgreSQL returns numeric/bigint as string — coerce to avoid JS string concatenation
            const fromBalance = Number(fromAccount.balance);

            const toAccount = await paymentRepository.lockAccount(trx, params.toAccountId) as IAccountRow | undefined;
            if (!toAccount) {
              throw new AppError(ErrorCodes.RECIPIENT_NOT_FOUND, `Recipient account '${params.toAccountId}' not found`, 404);
            }
            if (toAccount.status !== 'active') {
              throw new AppError(ErrorCodes.ACCOUNT_FROZEN, `Recipient account '${params.toAccountId}' is ${toAccount.status}`, 403);
            }
            const toBalance = Number(toAccount.balance);

            // ── STEP 7: Balance Check ─────────────────────────────────────────
            if (fromBalance < params.amount) {
              throw AppError.insufficientBalance(params.fromAccountId, params.amount, fromBalance);
            }

            // ── STEP 8: Update Sender — Optimistic Lock ───────────────────────
            // WHERE version = fromAccount.version is the optimistic lock.
            const rowsUpdated = await paymentRepository.updateBalance(
              trx,
              params.fromAccountId,
              fromBalance - params.amount,
              fromAccount.version
            );

            // ── STEP 9: Handle Concurrent Modification ────────────────────────
            if (rowsUpdated === 0) {
              throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, 'Concurrent modification detected. Please retry.', 409);
            }

            // ── STEP 10: Update Recipient ─────────────────────────────────────
            await paymentRepository.creditAccount(
              trx,
              params.toAccountId,
              toBalance + params.amount,
              toAccount.version
            );

            // ── STEP 11: Create Transaction Record ────────────────────────────
            // (Creating the record first so we have the ID for ledger entries)
            const newTransaction = await paymentRepository.create(trx, {
              idempotencyKey: params.idempotencyKey,
              fromAccountId: params.fromAccountId,
              toAccountId: params.toAccountId,
              amount: params.amount,
              currency: params.currency,
              status: 'completed',
              fraudScore: fraudResult.score,
              fraudAction: fraudResult.action,
              description: params.description,
            });

            // ── STEP 12: Write Ledger Entries (Double-Entry) ──────────────────
            await ledgerService.createEntries(trx, {
              transactionId: newTransaction.id,
              fromAccountId: params.fromAccountId,
              toAccountId: params.toAccountId,
              amount: params.amount,
              fromBalanceBefore: fromBalance,
              fromBalanceAfter: fromBalance - params.amount,
              toBalanceBefore: toBalance,
              toBalanceAfter: toBalance + params.amount,
            });

            // ── STEP 13: Persist Fired Fraud Signals ─────────────────────────
            await paymentRepository.insertFraudSignals(
              trx,
              newTransaction.id,
              fraudResult.signals.map((signal) => ({
                ruleName: signal.ruleName,
                scoreAdded: signal.scoreAdded,
                data: signal.signalData,
              }))
            );

            // ── STEP 14: Commit — automatic when callback returns ─────────────
            return newTransaction;
          });
          break;
        } catch (error: unknown) {
          const isConcurrentModification = error instanceof AppError
            && error.code === ErrorCodes.CONCURRENT_MODIFICATION;

          if (isConcurrentModification && retries < 2) {
            retries += 1;
            await new Promise((resolve) => setTimeout(resolve, 100 * retries));
            continue;
          }

          throw error;
        }
      }

      if (!transactionRow) {
        throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, 'Failed after retries.', 409);
      }
      // DB transaction committed here ↑

      const transaction = toCamelCase(transactionRow as unknown as Record<string, unknown>) as unknown as ITransaction;

      // ── STEP 15: Cache Idempotency Response ───────────────────────────
      await idempotencyService.set(params.idempotencyKey, transaction);

      // Invalidate all read caches that include this payment's data.
      // All DELs run in parallel — zero extra latency cost over the existing 4-key flush.
      // Busting txns/ledger page-1 ensures the sender/receiver see the new transaction
      // immediately on their next dashboard load, even within the 5-second cache window.
      await Promise.all([
        redis.del(`cache:stats:${params.fromAccountId}`),
        redis.del(`cache:stats:${params.toAccountId}`),
        redis.del(`cache:chart:${params.fromAccountId}:7`),
        redis.del(`cache:chart:${params.toAccountId}:7`),
        redis.del(`cache:txns:${params.fromAccountId}:1:20`),
        redis.del(`cache:txns:${params.toAccountId}:1:20`),
        redis.del(`cache:ledger:${params.fromAccountId}:1:20`),
        redis.del(`cache:ledger:${params.toAccountId}:1:20`),
      ]);

      // ── STEP 16: Publish Kafka Event (fire-and-forget) ─────────────────
      // CRITICAL: Published only AFTER the DB transaction commits successfully.
      // PERF: We do NOT await the Kafka ACK — saves ~100ms on every payment.
      // The DB is already committed; losing a Kafka event is handled by the
      // dead-letter-queue retry on the consumer side. Money never double-moves.
      publishEvent(KafkaTopics.PAYMENT_COMPLETED, {
        transactionId: transaction.id,
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        currency: params.currency,
        description: params.description ?? null,
        fraudScore: fraudResult.score,
        fraudAction: fraudResult.action,
        traceId: params.traceId,
      }, params.traceId).catch((kafkaErr: unknown) => {
        // Non-fatal: log the error but don't fail the HTTP response.
        // The DB transaction is already committed — money has moved safely.
        logger.error('kafka_completed_event_failed', {
          transactionId: transaction.id,
          traceId: params.traceId,
          error: kafkaErr instanceof Error ? kafkaErr.message : 'Unknown error',
        });
      });

      logger.info('payment_completed', {
        traceId: params.traceId,
        transactionId: transaction.id,
        amount: params.amount,
      });

      // ── STEP 17: Return Success ────────────────────────────────────────
      return { success: true, data: transaction, statusCode: 201 };

    } catch (error: unknown) {
      // Publish failure event for webhook/notification services
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      try {
        await publishEvent(KafkaTopics.PAYMENT_FAILED, {
          idempotencyKey: params.idempotencyKey,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          reason: errMessage,
          traceId: params.traceId,
        }, params.traceId);
      } catch (kafkaErr) {
        logger.error('kafka_failure_event_failed', { traceId: params.traceId });
      }
      throw error;

    } finally {
      // ── STEP 14: ALWAYS Release Locks ─────────────────────────────────
      // finally runs even if an error was thrown.
      await releaseAllLocks(lockKeys);
    }
  },

  // GET /payments/:transactionId — returns transaction + fraud signals + ledger entries
  async getTransaction(transactionId: string, userId: string): Promise<IResult<unknown>> {
    const result = await paymentRepository.findByIdWithSignals(transactionId);
    if (!result) {
      throw AppError.notFound('Transaction', transactionId);
    }

    const transaction = toCamelCase(result.transaction as unknown as Record<string, unknown>) as unknown as ITransaction;
    const signals = result.signals.map((s: unknown) => toCamelCase(s as Record<string, unknown>));

    // Verify the requesting user owns one of the accounts involved
    const fromAccount = await db('accounts').where({ id: transaction.fromAccountId }).first();
    const toAccount = await db('accounts').where({ id: transaction.toAccountId }).first();

    if (fromAccount?.user_id !== userId && toAccount?.user_id !== userId) {
      throw AppError.notFound('Transaction', transactionId);
    }

    // Fetch ledger entries for this transaction — real double-entry bookkeeping data
    const ledgerRows = await db('ledger_entries')
      .where({ transaction_id: transactionId })
      .orderBy('created_at', 'asc');
    const ledger = ledgerRows.map((r: unknown) => toCamelCase(r as Record<string, unknown>));

    return {
      success: true,
      statusCode: 200,
      data: { ...transaction, fraudSignals: signals, ledger },
    };
  },

  async getTransactionDetails(transactionId: string, userId: string): Promise<IResult<unknown>> {
    const [transactionRow, ledgerRows, fraudRows] = await Promise.all([
      paymentRepository.findById(transactionId),
      ledgerRepository.findByTransactionId(transactionId),
      fraudRepository.findSignalsByTransactionId(transactionId),
    ]);

    if (!transactionRow) {
      throw AppError.notFound('Transaction', transactionId);
    }

    const transaction = toCamelCase(transactionRow as unknown as Record<string, unknown>) as unknown as ITransaction;

    const [fromAccount, toAccount] = await Promise.all([
      db('accounts').where({ id: transaction.fromAccountId }).first(),
      db('accounts').where({ id: transaction.toAccountId }).first(),
    ]);

    if (fromAccount?.user_id !== userId && toAccount?.user_id !== userId) {
      throw AppError.notFound('Transaction', transactionId);
    }

    const ledgerEntries = ledgerRows.map((row) => {
      const item = toCamelCase(row as unknown as Record<string, unknown>) as unknown as {
        id: string;
        entryType: 'debit' | 'credit';
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
      };

      return {
        id: item.id,
        entryType: item.entryType,
        amount: Number(item.amount ?? 0),
        balanceBefore: Number(item.balanceBefore ?? 0),
        balanceAfter: Number(item.balanceAfter ?? 0),
      };
    });

    const fraudSignals = fraudRows.map((row) => {
      const item = toCamelCase(row as unknown as Record<string, unknown>) as unknown as {
        ruleName: string;
        scoreAdded: number;
        signalData: Record<string, unknown>;
      };

      return {
        ruleName: item.ruleName,
        scoreAdded: Number(item.scoreAdded ?? 0),
        signalData: item.signalData ?? {},
      };
    });

    return {
      success: true,
      statusCode: 200,
      data: {
        transaction,
        ledgerEntries,
        fraudSignals,
      },
    };
  },
};
