// ═══════════════════════════════════════════════════════════════
// WEBHOOK SIGNER UNIT TESTS
// Tests HMAC-SHA256 signing: "sha256=" prefix, determinism, tamper detection, key isolation
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';

import { signPayload, buildWebhookHeaders } from '../../../src/signer';

describe('WebhookSigner', () => {
  // ────────────────────────────────────────────────────────────
  it(`SIGN-01: signature starts with sha256= prefix matching Stripe format exactly`, () => {
    const sig = signPayload('secret', 'payload');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  // ────────────────────────────────────────────────────────────
  it(`SIGN-02: same inputs always produce same signature (deterministic)`, () => {
    expect(signPayload('secret', 'payload'))
      .toBe(signPayload('secret', 'payload'));
  });

  // ────────────────────────────────────────────────────────────
  it(`SIGN-03: different payload produces different signature (tamper detection)`, () => {
    expect(signPayload('secret', '{"amount":100}'))
      .not.toBe(signPayload('secret', '{"amount":200}'));
  });

  // ────────────────────────────────────────────────────────────
  it(`SIGN-04: different secret produces different signature (key isolation)`, () => {
    expect(signPayload('secret-A', 'payload'))
      .not.toBe(signPayload('secret-B', 'payload'));
  });

  // ────────────────────────────────────────────────────────────
  it(`SIGN-05: empty payload produces valid signature`, () => {
    const sig = signPayload('secret', '');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  // ────────────────────────────────────────────────────────────
  it(`SIGN-06: signature is exactly 71 characters (sha256= prefix + 64 hex chars)`, () => {
    const sig = signPayload('my-secret', '{"test": true}');
    expect(sig.length).toBe(7 + 64); // "sha256=" + 64 hex
  });
});

describe('buildWebhookHeaders', () => {
  // ────────────────────────────────────────────────────────────
  it(`HEADERS-01: includes all required Settlr headers`, () => {
    const headers = buildWebhookHeaders('secret', '{"data":1}', 'payment.completed', 'del-001');

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Settlr-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(headers['X-Settlr-Event']).toBe('payment.completed');
    expect(headers['X-Settlr-Delivery']).toBe('del-001');
    expect(headers['X-Settlr-Timestamp']).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────
  it(`HEADERS-02: signature in headers matches direct signPayload call`, () => {
    const payload = '{"amount":50000}';
    const secret = 'whsec_test123';

    const headers = buildWebhookHeaders(secret, payload, 'payment.completed', 'del-001');
    const directSig = signPayload(secret, payload);

    expect(headers['X-Settlr-Signature']).toBe(directSig);
  });
});
