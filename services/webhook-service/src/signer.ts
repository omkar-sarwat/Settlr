// HMAC-SHA256 payload signer — signs webhook payloads exactly like Stripe does.
import crypto from 'crypto';

// Produces 'sha256=<hex_digest>' signature identical to Stripe's format
export function signPayload(secret: string, payload: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Build the standard headers for every outgoing webhook request
export function buildWebhookHeaders(
  secret: string,
  payloadString: string,
  eventType: string,
  deliveryId: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Settlr-Signature': signPayload(secret, payloadString),
    'X-Settlr-Event': eventType,
    'X-Settlr-Delivery': deliveryId,
    'X-Settlr-Timestamp': Date.now().toString(),
  };
}
