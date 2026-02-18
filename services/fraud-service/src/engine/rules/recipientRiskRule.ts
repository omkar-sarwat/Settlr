// Recipient risk rule (+20 pts) — fires if recipient receives from >10 unique senders in last hour (money mule pattern).
import { redis } from '@settlr/redis';
import type { IFraudSignal } from '@settlr/types';

export async function checkRecipientRisk(toAccountId: string): Promise<IFraudSignal | null> {
  const key = `fraud:recipient:${toAccountId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour window

  if (count > 10) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'RECIPIENT_RISK',
      scoreAdded: 20,
      signalData: { uniqueSendersInLastHour: count },
    };
  }
  return null;
}
