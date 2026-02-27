// ═══════════════════════════════════════════════════════════════
// ROUND AMOUNT RULE UNIT TESTS
// Tests suspicious round amount detection: ₹1K, ₹5K, ₹10K, ₹50K → +5 pts
// Pure function — no external dependencies (no Redis, no DB)
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';

import { checkRoundAmount } from '../../../src/engine/rules/roundAmountRule';

describe('RoundAmountRule', () => {
  // ────────────────────────────────────────────────────────────
  // ROUND-01: All 4 suspicious amounts must fire
  // ────────────────────────────────────────────────────────────
  const suspiciousAmounts = [
    { paise: 100000,  rupees: '₹1,000'  },
    { paise: 500000,  rupees: '₹5,000'  },
    { paise: 1000000, rupees: '₹10,000' },
    { paise: 5000000, rupees: '₹50,000' },
  ];

  suspiciousAmounts.forEach(({ paise, rupees }) => {
    it(`ROUND-01: fires for suspicious round amount ${rupees} (${paise} paise)`, async () => {
      const signal = await checkRoundAmount(paise);

      expect(signal).not.toBeNull();
      expect(signal!.scoreAdded).toBe(5);
      expect(signal!.ruleName).toBe('ROUND_AMOUNT');
      expect(signal!.signalData.amount).toBe(paise);
    });
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-02: does NOT fire for ₹999 (99900 paise) — not in suspicious list`, async () => {
    const signal = await checkRoundAmount(99900);

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-03: does NOT fire for ₹1001 (100100 paise) — close but not exact`, async () => {
    const signal = await checkRoundAmount(100100);

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-04: does NOT fire for ₹200 (20000 paise) — only specific amounts are suspicious`, async () => {
    const signal = await checkRoundAmount(20000);

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-05: does NOT fire for ₹100 (10000 paise) — small round amount not flagged`, async () => {
    const signal = await checkRoundAmount(10000);

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-06: does NOT fire for ₹1 (100 paise) — minimum realistic transfer`, async () => {
    const signal = await checkRoundAmount(100);

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`ROUND-07: does NOT fire for arbitrary non-round amount ₹2,345.67`, async () => {
    const signal = await checkRoundAmount(234567);

    expect(signal).toBeNull();
  });
});
