// New account rule (+15 pts) — fires if the sending account is less than 7 days old.
import type { IFraudSignal } from '@settlr/types';

export async function checkNewAccount(accountCreatedAt: Date): Promise<IFraudSignal | null> {
  const ageMs = Date.now() - accountCreatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 7) {
    return {
      id: '', transactionId: '', createdAt: '',
      ruleName: 'NEW_ACCOUNT',
      scoreAdded: 15,
      signalData: { accountAgeInDays: Math.floor(ageDays) },
    };
  }
  return null;
}
