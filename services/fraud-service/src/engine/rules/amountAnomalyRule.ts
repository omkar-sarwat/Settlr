// Amount anomaly rule (+30 pts) — fires if transfer amount is >5x the account's average. Uses Redis sorted set.
import { redis } from '@settlr/redis';
import type { IFraudSignal } from '@settlr/types';

export async function checkAmountAnomaly(accountId: string, amount: number): Promise<IFraudSignal | null> {
  const key = `fraud:amounts:${accountId}`;
  // Store each amount in a sorted set keyed by timestamp
  await redis.zadd(key, Date.now(), amount.toString());
  // Keep only the last 20 amounts
  await redis.zremrangebyrank(key, 0, -21);
  // 30 day TTL for cleanup
  await redis.expire(key, 2592000);

  const amounts = (await redis.zrange(key, 0, -1)).map(Number);
  // Need at least 3 data points for meaningful comparison
  if (amounts.length < 3) return null;

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (amount > avg * 5) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'AMOUNT_ANOMALY',
      scoreAdded: 30,
      signalData: { amount, averageAmount: Math.round(avg), threshold: 5 },
    };
  }
  return null;
}
