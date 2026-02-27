// Recipient risk rule (+20 pts) — fires if recipient receives from >10 unique senders in last hour (money mule pattern).
// Uses a Redis Set to track UNIQUE sender account IDs per recipient, not a simple counter.
import { redis } from '@settlr/redis';
import type { IFraudSignal } from '@settlr/types';

export async function checkRecipientRisk(toAccountId: string, fromAccountId: string): Promise<IFraudSignal | null> {
  const key = `fraud:recipient:${toAccountId}`;

  // SADD adds fromAccountId to the set — duplicates are ignored automatically
  await redis.sadd(key, fromAccountId);
  await redis.expire(key, 3600); // 1 hour window

  // SCARD returns the number of unique elements in the set
  const uniqueSenders = await redis.scard(key);

  if (uniqueSenders > 10) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'RECIPIENT_RISK',
      scoreAdded: 20,
      signalData: { uniqueSendersInLastHour: uniqueSenders },
    };
  }
  return null;
}
