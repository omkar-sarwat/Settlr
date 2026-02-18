// Round amount rule (+5 pts) — fires if amount is a suspicious round number.
import type { IFraudSignal } from '@settlr/types';

// In paise: ₹1000, ₹5000, ₹10000, ₹50000
const SUSPICIOUS_AMOUNTS = [100000, 500000, 1000000, 5000000];

export async function checkRoundAmount(amount: number): Promise<IFraudSignal | null> {
  if (SUSPICIOUS_AMOUNTS.includes(amount)) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'ROUND_AMOUNT',
      scoreAdded: 5,
      signalData: { amount },
    };
  }
  return null;
}
