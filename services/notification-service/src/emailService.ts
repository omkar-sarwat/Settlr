// Email service — sends transactional emails via Resend.com API.
// Handles payment confirmations, fraud alerts, failure notifications, and webhook delivery failures.

import { config } from '@settlr/config';
import { logger } from '@settlr/logger';
import type { IKafkaEvent, ITransaction } from '@settlr/types';
import { formatPaise } from '@settlr/types';

// ── Resend HTTP API types ──────────────────────────────────────────────────
interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

interface ResendResponse {
  id?: string;
  message?: string;
}

// ── HTTP call to Resend.com ────────────────────────────────────────────────
async function sendEmail(payload: ResendPayload): Promise<void> {
  if (!config.resendApiKey) {
    logger.warn('email_skipped_no_api_key', { to: payload.to, subject: payload.subject });
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ResendResponse;

  if (!response.ok) {
    logger.error('email_send_failed', {
      status: response.status,
      error: data.message,
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  logger.info('email_sent', { emailId: data.id, to: payload.to, subject: payload.subject });
}

// ── Payment completed — notify sender + recipient ──────────────────────────
export async function handlePaymentCompleted(event: IKafkaEvent): Promise<void> {
  const tx = event.data as ITransaction;
  const amount = formatPaise(tx.amount);

  // Notify sender
  await sendEmail({
    from: config.emailFrom,
    to: [`sender-${tx.fromAccountId}@settlr.dev`],
    subject: `Payment of ${amount} Sent Successfully`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>Your payment of <strong>${amount}</strong> has been completed.</p>
      <table>
        <tr><td>Transaction ID</td><td>${tx.id}</td></tr>
        <tr><td>To Account</td><td>${tx.toAccountId}</td></tr>
        <tr><td>Amount</td><td>${amount}</td></tr>
        <tr><td>Status</td><td>Completed</td></tr>
        <tr><td>Date</td><td>${tx.createdAt || event.timestamp}</td></tr>
      </table>
      <p>Thank you for using Settlr.</p>
    `,
  });

  // Notify recipient
  await sendEmail({
    from: config.emailFrom,
    to: [`recipient-${tx.toAccountId}@settlr.dev`],
    subject: `You Received ${amount}`,
    html: `
      <h2>Payment Received</h2>
      <p>You have received <strong>${amount}</strong> into your account.</p>
      <table>
        <tr><td>Transaction ID</td><td>${tx.id}</td></tr>
        <tr><td>From Account</td><td>${tx.fromAccountId}</td></tr>
        <tr><td>Amount</td><td>${amount}</td></tr>
        <tr><td>Date</td><td>${tx.createdAt || event.timestamp}</td></tr>
      </table>
    `,
  });
}

// ── Payment failed — notify sender ─────────────────────────────────────────
export async function handlePaymentFailed(event: IKafkaEvent): Promise<void> {
  const tx = event.data as ITransaction;
  const amount = formatPaise(tx.amount);

  await sendEmail({
    from: config.emailFrom,
    to: [`sender-${tx.fromAccountId}@settlr.dev`],
    subject: `Payment of ${amount} Failed`,
    html: `
      <h2>Payment Failed</h2>
      <p>Your payment of <strong>${amount}</strong> could not be processed.</p>
      <table>
        <tr><td>Transaction ID</td><td>${tx.id}</td></tr>
        <tr><td>To Account</td><td>${tx.toAccountId}</td></tr>
        <tr><td>Amount</td><td>${amount}</td></tr>
        <tr><td>Status</td><td>Failed</td></tr>
        <tr><td>Reason</td><td>${tx.failureReason || 'Unknown'}</td></tr>
      </table>
      <p>Please check your account balance and try again.</p>
    `,
  });
}

// ── Payment fraud blocked — urgent alert to sender ─────────────────────────
export async function handlePaymentFraudBlocked(event: IKafkaEvent): Promise<void> {
  const tx = event.data as ITransaction;
  const amount = formatPaise(tx.amount);

  await sendEmail({
    from: config.emailFrom,
    to: [`sender-${tx.fromAccountId}@settlr.dev`],
    subject: `⚠️ Payment of ${amount} Blocked — Suspicious Activity`,
    html: `
      <h2>Payment Blocked — Fraud Detection</h2>
      <p>Your payment of <strong>${amount}</strong> was blocked by our security system.</p>
      <table>
        <tr><td>Transaction ID</td><td>${tx.id}</td></tr>
        <tr><td>To Account</td><td>${tx.toAccountId}</td></tr>
        <tr><td>Amount</td><td>${amount}</td></tr>
        <tr><td>Status</td><td>Fraud Blocked</td></tr>
      </table>
      <p>If you believe this was a legitimate transaction, please contact support.</p>
      <p><strong>Do not share your credentials with anyone.</strong></p>
    `,
  });
}

// ── Webhook delivery permanently failed — notify endpoint owner ────────────
interface WebhookFailurePayload {
  endpointId: string;
  deliveryId: string;
  url: string;
  eventType: string;
  attempts: number;
}

export async function handleWebhookDeliveryFailed(event: IKafkaEvent): Promise<void> {
  const payload = event.data as WebhookFailurePayload;

  await sendEmail({
    from: config.emailFrom,
    to: [`webhook-owner-${payload.endpointId}@settlr.dev`],
    subject: `Webhook Delivery Failed — ${payload.eventType}`,
    html: `
      <h2>Webhook Delivery Failed</h2>
      <p>A webhook delivery to your endpoint has permanently failed after all retries.</p>
      <table>
        <tr><td>Endpoint ID</td><td>${payload.endpointId}</td></tr>
        <tr><td>Delivery ID</td><td>${payload.deliveryId}</td></tr>
        <tr><td>URL</td><td>${payload.url}</td></tr>
        <tr><td>Event Type</td><td>${payload.eventType}</td></tr>
        <tr><td>Attempts</td><td>${payload.attempts}</td></tr>
      </table>
      <p>Please check your endpoint URL and connectivity.</p>
    `,
  });
}
