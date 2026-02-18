// Velocity rule (+25 pts) — fires if account makes >3 transactions in 60 seconds. Uses Redis INCR with 60s TTL.
import { redis } from '@settlr/redis';
import type { IFraudSignal } from '@settlr/types';

export async function checkVelocity(accountId: string): Promise<IFraudSignal | null> {
  const key = `fraud:velocity:${accountId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60);

  if (count > 3) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'VELOCITY_CHECK',
      scoreAdded: 25,
      signalData: { transactionsInLastMinute: count },
    };
  }
  return null;
}
