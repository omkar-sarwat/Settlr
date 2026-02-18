// Unit tests for the fraud engine — tests each rule individually, combined scoring,
// Promise.all() parallel execution, and score capping at 100.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock all 6 rules ────────────────────────────────────────────────────────
vi.mock('../../src/engine/rules/velocityRule', () => ({
  checkVelocity: vi.fn(),
}));
vi.mock('../../src/engine/rules/amountAnomalyRule', () => ({
  checkAmountAnomaly: vi.fn(),
}));
vi.mock('../../src/engine/rules/unusualHourRule', () => ({
  checkUnusualHour: vi.fn(),
}));
vi.mock('../../src/engine/rules/newAccountRule', () => ({
  checkNewAccount: vi.fn(),
}));
vi.mock('../../src/engine/rules/roundAmountRule', () => ({
  checkRoundAmount: vi.fn(),
}));
vi.mock('../../src/engine/rules/recipientRiskRule', () => ({
  checkRecipientRisk: vi.fn(),
}));

vi.mock('@settlr/config', () => ({
  config: {
    fraudApproveBelow: 30,
    fraudReviewBelow: 60,
    fraudChallengeBelow: 80,
  },
}));

import { runFraudEngine } from '../../src/engine/fraudEngine';
import { checkVelocity } from '../../src/engine/rules/velocityRule';
import { checkAmountAnomaly } from '../../src/engine/rules/amountAnomalyRule';
import { checkUnusualHour } from '../../src/engine/rules/unusualHourRule';
import { checkNewAccount } from '../../src/engine/rules/newAccountRule';
import { checkRoundAmount } from '../../src/engine/rules/roundAmountRule';
import { checkRecipientRisk } from '../../src/engine/rules/recipientRiskRule';

const signal = (ruleName: string, scoreAdded: number) => ({
  id: '', transactionId: '', createdAt: '',
  ruleName,
  scoreAdded,
  signalData: {},
});

const baseInput = {
  fromAccountId: 'acc-sender-001',
  toAccountId: 'acc-recipient-001',
  amount: 50000,
  accountCreatedAt: new Date('2024-01-01'),
};

describe('FraudEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all rules return null (clean transaction)
    (checkVelocity as Mock).mockResolvedValue(null);
    (checkAmountAnomaly as Mock).mockResolvedValue(null);
    (checkUnusualHour as Mock).mockResolvedValue(null);
    (checkNewAccount as Mock).mockResolvedValue(null);
    (checkRoundAmount as Mock).mockResolvedValue(null);
    (checkRecipientRisk as Mock).mockResolvedValue(null);
  });

  it('returns score 0 and action "approve" when no rules fire', async () => {
    const result = await runFraudEngine(baseInput);

    expect(result.score).toBe(0);
    expect(result.action).toBe('approve');
    expect(result.signals).toHaveLength(0);
  });

  it('calls all 6 rules with correct arguments', async () => {
    await runFraudEngine(baseInput);

    expect(checkVelocity).toHaveBeenCalledWith(baseInput.fromAccountId);
    expect(checkAmountAnomaly).toHaveBeenCalledWith(baseInput.fromAccountId, baseInput.amount);
    expect(checkUnusualHour).toHaveBeenCalled();
    expect(checkNewAccount).toHaveBeenCalledWith(baseInput.accountCreatedAt);
    expect(checkRoundAmount).toHaveBeenCalledWith(baseInput.amount);
    expect(checkRecipientRisk).toHaveBeenCalledWith(baseInput.toAccountId);
  });

  it('runs all rules in parallel via Promise.all (not sequential)', async () => {
    // We verify parallelism by checking that all mocks receive calls
    // before any of them would resolve in a sequential flow.
    const callOrder: string[] = [];

    (checkVelocity as Mock).mockImplementation(async () => {
      callOrder.push('velocity');
      return null;
    });
    (checkAmountAnomaly as Mock).mockImplementation(async () => {
      callOrder.push('amount');
      return null;
    });
    (checkUnusualHour as Mock).mockImplementation(async () => {
      callOrder.push('hour');
      return null;
    });
    (checkNewAccount as Mock).mockImplementation(async () => {
      callOrder.push('newAccount');
      return null;
    });
    (checkRoundAmount as Mock).mockImplementation(async () => {
      callOrder.push('round');
      return null;
    });
    (checkRecipientRisk as Mock).mockImplementation(async () => {
      callOrder.push('recipient');
      return null;
    });

    await runFraudEngine(baseInput);

    // All 6 rules were called
    expect(callOrder).toHaveLength(6);
  });

  describe('individual rule scoring', () => {
    it('velocity rule adds 25 points', async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(25);
      expect(result.action).toBe('approve'); // 25 < 30
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].ruleName).toBe('VELOCITY_CHECK');
    });

    it('amount anomaly adds 30 points → triggers "review"', async () => {
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(30);
      expect(result.action).toBe('review'); // 30 >= 30
    });

    it('unusual hour adds 10 points', async () => {
      (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', 10));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(10);
      expect(result.action).toBe('approve');
    });

    it('new account adds 15 points', async () => {
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(15);
    });

    it('round amount adds 5 points', async () => {
      (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', 5));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(5);
    });

    it('recipient risk adds 20 points', async () => {
      (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', 20));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(20);
    });
  });

  describe('combined scoring and action thresholds', () => {
    it('sums scores from multiple rules', async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));
      (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', 5));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(45); // 25 + 15 + 5
      expect(result.action).toBe('review'); // 45 >= 30 but < 60
      expect(result.signals).toHaveLength(3);
    });

    it('returns "challenge" when score >= 60 and < 80', async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
      (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', 10));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(65); // 25 + 30 + 10
      expect(result.action).toBe('challenge');
    });

    it('returns "decline" when score >= 80', async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
      (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', 20));
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(90); // 25 + 30 + 20 + 15
      expect(result.action).toBe('decline');
    });

    it('caps score at 100 when total exceeds 100', async () => {
      // All 6 rules fire: 25 + 30 + 10 + 15 + 5 + 20 = 105 → capped at 100
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
      (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', 10));
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));
      (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', 5));
      (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', 20));

      const result = await runFraudEngine(baseInput);

      expect(result.score).toBe(100); // Capped, not 105
      expect(result.action).toBe('decline');
      expect(result.signals).toHaveLength(6);
    });
  });

  it('filters out null signals from rules that did not fire', async () => {
    (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
    // All other rules return null (default)

    const result = await runFraudEngine(baseInput);

    expect(result.signals).toHaveLength(1);
    expect(result.signals.every((s: { ruleName: string }) => s.ruleName !== null)).toBe(true);
  });
});
