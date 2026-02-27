// ═══════════════════════════════════════════════════════════════
// UNUSUAL HOUR RULE UNIT TESTS
// Tests IST timezone window: fires between 1am-5am IST (+10 pts)
// Uses vi.setSystemTime to control Date.now()
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, afterEach, vi } from 'vitest';

import { checkUnusualHour } from '../../../src/engine/rules/unusualHourRule';

describe('UnusualHourRule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-01: fires at 1am IST — start of suspicious window`, async () => {
    // 1am IST = 7:30pm UTC previous day (IST = UTC + 5:30)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T19:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).not.toBeNull();
    expect(signal!.scoreAdded).toBe(10);
    expect(signal!.ruleName).toBe('UNUSUAL_HOUR');
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-02: fires at 5am IST — end of suspicious window (inclusive boundary)`, async () => {
    // 5am IST = 11:30pm UTC previous day
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T23:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).not.toBeNull();
    expect(signal!.scoreAdded).toBe(10);
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-03: does NOT fire at 6am IST — just outside suspicious window`, async () => {
    // 6am IST = 12:30am UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T00:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-04: does NOT fire at 2pm IST — normal business hours`, async () => {
    // 2pm IST = 8:30am UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T08:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-05: fires at 3am IST — middle of suspicious window`, async () => {
    // 3am IST = 9:30pm UTC previous day
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T21:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).not.toBeNull();
    expect(signal!.signalData.hour).toBe(3);
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-06: does NOT fire at midnight IST (0:00) — before suspicious window`, async () => {
    // 0:00 IST = 6:30pm UTC previous day
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T18:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  it(`HOUR-07: does NOT fire at 12pm IST noon — daytime`, async () => {
    // 12pm IST = 6:30am UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T06:30:00.000Z'));

    const signal = await checkUnusualHour();

    expect(signal).toBeNull();
  });
});
