// Fraud engine runner — executes all 6 rules in Promise.all() (never sequential). Returns score + action + signals.
import { config } from '@settlr/config';
import type { IFraudInput, IFraudResult, IFraudSignal } from '@settlr/types';
import { checkVelocity } from './rules/velocityRule';
import { checkAmountAnomaly } from './rules/amountAnomalyRule';
import { checkUnusualHour } from './rules/unusualHourRule';
import { checkNewAccount } from './rules/newAccountRule';
import { checkRoundAmount } from './rules/roundAmountRule';
import { checkRecipientRisk } from './rules/recipientRiskRule';

// Convert numeric score to action using configurable thresholds
function scoreToAction(score: number): 'approve' | 'review' | 'challenge' | 'decline' {
  if (score < config.fraudApproveBelow) return 'approve';
  if (score < config.fraudReviewBelow) return 'review';
  if (score < config.fraudChallengeBelow) return 'challenge';
  return 'decline';
}

export async function runFraudEngine(input: IFraudInput): Promise<IFraudResult> {
  // ALL rules run simultaneously — total time = slowest single rule, not sum
  const results = await Promise.all([
    checkVelocity(input.fromAccountId),
    checkAmountAnomaly(input.fromAccountId, input.amount),
    checkUnusualHour(),
    checkNewAccount(input.accountCreatedAt),
    checkRoundAmount(input.amount),
    checkRecipientRisk(input.toAccountId),
  ]);

  // Filter out null signals (rule didn't fire)
  const signals: IFraudSignal[] = results.filter(
    (s): s is IFraudSignal => s !== null
  );

  // Sum all scores, cap at 100
  const totalScore = signals.reduce((sum, s) => sum + s.scoreAdded, 0);
  const cappedScore = Math.min(totalScore, 100);

  return {
    score: cappedScore,
    action: scoreToAction(cappedScore),
    signals,
  };
}
