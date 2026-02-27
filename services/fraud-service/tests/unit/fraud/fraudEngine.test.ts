// ═══════════════════════════════════════════════════════════════
// FRAUD ENGINE ORCHESTRATION TESTS
// Tests Promise.all() parallel execution, score summing, capping,
// and all score-to-action boundary transitions.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ── Mock all 6 rules ────────────────────────────────────────
vi.mock('../../../src/engine/rules/velocityRule', () => ({
  checkVelocity: vi.fn(),
}));
vi.mock('../../../src/engine/rules/amountAnomalyRule', () => ({
  checkAmountAnomaly: vi.fn(),
}));
vi.mock('../../../src/engine/rules/unusualHourRule', () => ({
  checkUnusualHour: vi.fn(),
}));
vi.mock('../../../src/engine/rules/newAccountRule', () => ({
  checkNewAccount: vi.fn(),
}));
vi.mock('../../../src/engine/rules/roundAmountRule', () => ({
  checkRoundAmount: vi.fn(),
}));
vi.mock('../../../src/engine/rules/recipientRiskRule', () => ({
  checkRecipientRisk: vi.fn(),
}));

vi.mock('@settlr/config', () => ({
  config: {
    fraudApproveBelow: 30,
    fraudReviewBelow: 60,
    fraudChallengeBelow: 80,
  },
}));

import { runFraudEngine, scoreToAction } from '../../../src/engine/fraudEngine';
import { checkVelocity } from '../../../src/engine/rules/velocityRule';
import { checkAmountAnomaly } from '../../../src/engine/rules/amountAnomalyRule';
import { checkUnusualHour } from '../../../src/engine/rules/unusualHourRule';
import { checkNewAccount } from '../../../src/engine/rules/newAccountRule';
import { checkRoundAmount } from '../../../src/engine/rules/roundAmountRule';
import { checkRecipientRisk } from '../../../src/engine/rules/recipientRiskRule';

// ── Helpers ──────────────────────────────────────────────────
const signal = (ruleName: string, scoreAdded: number) => ({
  id: '', transactionId: '', createdAt: '',
  ruleName,
  scoreAdded,
  signalData: {},
});

const makeFraudInput = () => ({
  fromAccountId: 'acc-sender-001',
  toAccountId: 'acc-recipient-001',
  amount: 50000,
  accountCreatedAt: new Date('2024-01-01'),
  traceId: 'trace-fraud-test',
});

/** Map rule short names to their mock fns */
const ruleMockMap: Record<string, Mock> = {};
function initRuleMockMap() {
  ruleMockMap['velocity']   = checkVelocity as Mock;
  ruleMockMap['amount']     = checkAmountAnomaly as Mock;
  ruleMockMap['hour']       = checkUnusualHour as Mock;
  ruleMockMap['newAccount'] = checkNewAccount as Mock;
  ruleMockMap['round']      = checkRoundAmount as Mock;
  ruleMockMap['recipient']  = checkRecipientRisk as Mock;
}

/** Set up a delayed mock for a rule (simulates async work) */
function mockRule(name: string, delayMs: number) {
  ruleMockMap[name].mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(null), delayMs))
  );
}

/** Set up specific rules to fire with given scores */
function setupFraudMocks(rules: Record<string, { scoreAdded: number }>) {
  // Default: all rules return null
  Object.values(ruleMockMap).forEach(fn => fn.mockResolvedValue(null));
  // Override specific rules
  for (const [ruleName, { scoreAdded }] of Object.entries(rules)) {
    switch (ruleName) {
      case 'VELOCITY_CHECK':
        (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', scoreAdded));
        break;
      case 'AMOUNT_ANOMALY':
        (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', scoreAdded));
        break;
      case 'UNUSUAL_HOUR':
        (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', scoreAdded));
        break;
      case 'NEW_ACCOUNT':
        (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', scoreAdded));
        break;
      case 'ROUND_AMOUNT':
        (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', scoreAdded));
        break;
      case 'RECIPIENT_RISK':
        (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', scoreAdded));
        break;
    }
  }
}

/** All 6 rules fire: 25+30+10+15+5+20 = 105 → cap at 100 */
function setupAllRulesFired() {
  (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
  (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
  (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', 10));
  (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));
  (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', 5));
  (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', 20));
}

// ═════════════════════════════════════════════════════════════
describe('FraudEngine — Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initRuleMockMap();
    // Default: all rules return null (clean transaction)
    Object.values(ruleMockMap).forEach(fn => fn.mockResolvedValue(null));
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-01: runs all 6 rules in parallel using Promise.all — total time equals slowest rule, not sum of all rules`, async () => {
    // WHY: Sequential = 48ms. Parallel = 10ms.
    // At 62 TPS this difference determines if we meet SLA.
    const delays = [10, 8, 7, 9, 6, 8]; // ms per rule
    const rules  = ['velocity', 'amount', 'hour', 'newAccount', 'round', 'recipient'];

    rules.forEach((rule, i) => {
      mockRule(rule, delays[i]);
    });

    const start = Date.now();
    await runFraudEngine(makeFraudInput());
    const duration = Date.now() - start;

    // Parallel: max(10,8,7,9,6,8) = 10ms (with overhead ~25ms)
    // Sequential would be: 10+8+7+9+6+8 = 48ms
    expect(duration).toBeLessThan(30);

    // All 6 rules must have been called
    rules.forEach(rule => {
      expect(ruleMockMap[rule]).toHaveBeenCalledOnce();
    });
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-02: correctly sums scores from fired rules and returns signals array with only fired rules`, async () => {
    // VELOCITY fires: +25, AMOUNT fires: +30, Others: +0
    // Total: 55 → action: review
    setupFraudMocks({
      VELOCITY_CHECK: { scoreAdded: 25 },
      AMOUNT_ANOMALY: { scoreAdded: 30 },
    });

    const result = await runFraudEngine(makeFraudInput());

    expect(result.score).toBe(55);
    expect(result.action).toBe('review');
    expect(result.signals).toHaveLength(2);
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-03: caps score at 100 even when sum of all rules exceeds 100`, async () => {
    // All 6 rules fire: 25+30+10+15+5+20 = 105 → cap at 100
    setupAllRulesFired();

    const result = await runFraudEngine(makeFraudInput());

    expect(result.score).toBe(100); // NOT 105
    expect(result.action).toBe('decline');
    expect(result.signals).toHaveLength(6);
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-04: returns score 0 and action "approve" when no rules fire`, async () => {
    const result = await runFraudEngine(makeFraudInput());

    expect(result.score).toBe(0);
    expect(result.action).toBe('approve');
    expect(result.signals).toHaveLength(0);
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-05: calls all 6 rules with correct arguments`, async () => {
    const input = makeFraudInput();
    await runFraudEngine(input);

    expect(checkVelocity).toHaveBeenCalledWith(input.fromAccountId);
    expect(checkAmountAnomaly).toHaveBeenCalledWith(input.fromAccountId, input.amount);
    expect(checkUnusualHour).toHaveBeenCalled();
    expect(checkNewAccount).toHaveBeenCalledWith(input.accountCreatedAt);
    expect(checkRoundAmount).toHaveBeenCalledWith(input.amount);
    expect(checkRecipientRisk).toHaveBeenCalledWith(input.toAccountId, input.fromAccountId);
  });

  // ────────────────────────────────────────────────────────────
  it(`FRAUD-06: filters out null signals — only fired rules appear in signals array`, async () => {
    (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
    // All other rules return null

    const result = await runFraudEngine(makeFraudInput());

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].ruleName).toBe('VELOCITY_CHECK');
  });

  // ────────────────────────────────────────────────────────────
  // Score ↔ Action boundary tests — test every transition point
  // ────────────────────────────────────────────────────────────
  describe('Score to Action Mapping — Boundary Tests', () => {
    const cases = [
      { score: 0,   expected: 'approve'   },
      { score: 29,  expected: 'approve'   }, // upper boundary
      { score: 30,  expected: 'review'    }, // lower boundary
      { score: 59,  expected: 'review'    }, // upper boundary
      { score: 60,  expected: 'challenge' }, // lower boundary
      { score: 79,  expected: 'challenge' }, // upper boundary
      { score: 80,  expected: 'decline'   }, // lower boundary
      { score: 100, expected: 'decline'   },
    ];

    cases.forEach(({ score, expected }) => {
      it(`FRAUD-SCORE-${score}: score ${score} → "${expected}"`, () => {
        // WHY: Off-by-one errors at boundaries are the most
        // common bug in scoring systems. Test every boundary.
        expect(scoreToAction(score)).toBe(expected);
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // Combined scoring → action mapping through the engine
  // ────────────────────────────────────────────────────────────
  describe('Combined Scoring Through Engine', () => {
    it(`FRAUD-COMBINED-01: velocity(25) + newAccount(15) + round(5) = 45 → "review"`, async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));
      (checkRoundAmount as Mock).mockResolvedValue(signal('ROUND_AMOUNT', 5));

      const result = await runFraudEngine(makeFraudInput());

      expect(result.score).toBe(45);
      expect(result.action).toBe('review');
      expect(result.signals).toHaveLength(3);
    });

    it(`FRAUD-COMBINED-02: velocity(25) + amount(30) + hour(10) = 65 → "challenge"`, async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
      (checkUnusualHour as Mock).mockResolvedValue(signal('UNUSUAL_HOUR', 10));

      const result = await runFraudEngine(makeFraudInput());

      expect(result.score).toBe(65);
      expect(result.action).toBe('challenge');
    });

    it(`FRAUD-COMBINED-03: velocity(25) + amount(30) + recipient(20) + new(15) = 90 → "decline"`, async () => {
      (checkVelocity as Mock).mockResolvedValue(signal('VELOCITY_CHECK', 25));
      (checkAmountAnomaly as Mock).mockResolvedValue(signal('AMOUNT_ANOMALY', 30));
      (checkRecipientRisk as Mock).mockResolvedValue(signal('RECIPIENT_RISK', 20));
      (checkNewAccount as Mock).mockResolvedValue(signal('NEW_ACCOUNT', 15));

      const result = await runFraudEngine(makeFraudInput());

      expect(result.score).toBe(90);
      expect(result.action).toBe('decline');
      expect(result.signals).toHaveLength(4);
    });
  });
});
