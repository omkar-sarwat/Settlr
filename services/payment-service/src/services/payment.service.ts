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
      // Need sender account created_at for NEW_ACCOUNT rule
      const senderAccount = await db('accounts').where({ id: params.fromAccountId }).first();
      if (!senderAccount) {
        throw AppError.notFound('Sender account', params.fromAccountId);
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
      if (fraudResult.action === 'decline') {
        await publishEvent(KafkaTopics.PAYMENT_FRAUD_BLOCKED, {
          traceId: params.traceId,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          fraudScore: fraudResult.score,
          signals: fraudResult.signals.map((s) => s.ruleName),
        }, params.traceId);

        throw AppError.fraudBlocked(fraudResult.score);
      }

      // ── STEPS 5–13: Atomic Database Transaction ─────────────────────────
      const transactionRow = await db.transaction(async (trx) => {

        // ── STEP 6: Lock Rows in Database (SELECT ... FOR UPDATE) ────────
        const fromAccount = await paymentRepository.lockAccount(trx, params.fromAccountId) as IAccountRow | undefined;
        if (!fromAccount) {
          throw AppError.notFound('Sender account', params.fromAccountId);
        }

        const toAccount = await paymentRepository.lockAccount(trx, params.toAccountId) as IAccountRow | undefined;
        if (!toAccount) {
          throw AppError.notFound('Recipient account', params.toAccountId);
        }

        // ── STEP 7: Balance Check ─────────────────────────────────────────
        if (fromAccount.balance < params.amount) {
          throw AppError.insufficientBalance(params.fromAccountId, params.amount, fromAccount.balance);
        }

        // ── STEP 8: Update Sender — Optimistic Lock ───────────────────────
        // WHERE version = fromAccount.version is the optimistic lock.
        const rowsUpdated = await paymentRepository.updateBalance(
          trx,
          params.fromAccountId,
          fromAccount.balance - params.amount,
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
          toAccount.balance + params.amount,
          toAccount.version
        );

        // ── STEP 12: Create Transaction Record ────────────────────────────
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

        // ── STEP 11: Write Ledger Entries (Double-Entry) ──────────────────
        await ledgerService.createEntries(trx, {
          transactionId: newTransaction.id,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          fromBalanceBefore: fromAccount.balance,
          fromBalanceAfter: fromAccount.balance - params.amount,
          toBalanceBefore: toAccount.balance,
          toBalanceAfter: toAccount.balance + params.amount,
        });

        // ── STEP 13: Commit — automatic when callback returns ─────────────
        return newTransaction;
      });
      // DB transaction committed here ↑

      const transaction = toCamelCase(transactionRow as unknown as Record<string, unknown>) as unknown as ITransaction;

      // ── STEP 15: Cache Idempotency Response ───────────────────────────
      await idempotencyService.set(params.idempotencyKey, transaction);

      // ── STEP 16: Publish Kafka Event ──────────────────────────────────
      // CRITICAL: Only publish AFTER DB commit succeeds.
      await publishEvent(KafkaTopics.PAYMENT_COMPLETED, {
        transactionId: transaction.id,
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        currency: params.currency,
        fraudScore: fraudResult.score,
        traceId: params.traceId,
      }, params.traceId);

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

  // GET /payments/:transactionId — returns transaction + fraud signals
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

    return {
      success: true,
      statusCode: 200,
      data: { ...transaction, fraudSignals: signals },
    };
  },
};
