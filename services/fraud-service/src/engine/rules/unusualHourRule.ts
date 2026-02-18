// Unusual hour rule (+10 pts) — fires if transaction happens between 1:00am and 5:00am IST.
import type { IFraudSignal } from '@settlr/types';

export async function checkUnusualHour(): Promise<IFraudSignal | null> {
  // Convert UTC to IST (UTC+5:30)
  const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
  const hour = nowIST.getUTCHours();

  if (hour >= 1 && hour <= 5) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'UNUSUAL_HOUR',
      scoreAdded: 10,
      signalData: { hour },
    };
  }
  return null;
}
