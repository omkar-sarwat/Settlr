// All shared TypeScript interfaces used by every backend service.
// This is the single source of truth for data shapes across the entire Settlr backend.
// Every service imports from here — never define duplicate interfaces elsewhere.
// The frontend has its own types in settlr-ui/src/types/index.ts that mirror a subset of these.

// Re-export error types so consumers can do: import { AppError, ErrorCodes } from '@settlr/types';
export { AppError, ErrorCodes, type ErrorCode } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// USER — A person who has registered on Settlr
// Maps to the "users" table in PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
export interface IUser {
  id: string;                                          // UUID primary key
  email: string;                                       // Unique email address
  name: string | null;                                 // Optional display name
  phone: string | null;                                // Optional phone number
  passwordHash: string;                                // bcrypt hashed password — never expose in API
  kycStatus: 'pending' | 'verified' | 'rejected';     // Know Your Customer verification status
  isActive: boolean;                                   // Soft delete flag
  createdAt: string;                                   // ISO 8601 timestamp
  updatedAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT — A financial account that holds a balance (in paise)
// Maps to the "accounts" table in PostgreSQL
// One user can have multiple accounts
// ─────────────────────────────────────────────────────────────────────────────
export interface IAccount {
  id: string;                                          // UUID primary key
  userId: string;                                      // References users.id
  balance: number;                                     // ALWAYS in paise (integer). ₹100 = 10000.
  currency: 'INR';                                     // Only INR supported
  status: 'active' | 'frozen' | 'closed';             // Account lifecycle state
  version: number;                                     // Optimistic locking — incremented on every balance update
  createdAt: string;                                   // ISO 8601 timestamp
  updatedAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION — A single money transfer from one account to another
// Maps to the "transactions" table in PostgreSQL
// Status flow: pending → processing → completed | failed | reversed
// ─────────────────────────────────────────────────────────────────────────────
export interface ITransaction {
  id: string;                                          // UUID primary key
  idempotencyKey: string;                              // Client-generated UUID — UNIQUE, prevents double charges
  fromAccountId: string;                               // Sender's account UUID
  toAccountId: string;                                 // Recipient's account UUID
  amount: number;                                      // ALWAYS in paise (integer). Never float.
  currency: 'INR';                                     // Only INR supported
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  failureReason: string | null;                        // Human-readable error if failed
  fraudScore: number | null;                           // 0-100 risk score from fraud engine
  fraudAction: 'approve' | 'review' | 'challenge' | 'decline' | null;
  metadata: Record<string, unknown>;                   // Flexible JSONB field
  createdAt: string;                                   // ISO 8601 timestamp
  updatedAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER ENTRY — Double-entry bookkeeping record
// Every transfer creates EXACTLY 2 rows: one debit (sender) + one credit (recipient)
// These are the immutable audit trail — NEVER hard delete
// ─────────────────────────────────────────────────────────────────────────────
export interface ILedgerEntry {
  id: string;                                          // UUID primary key
  transactionId: string;                               // References transactions.id
  accountId: string;                                   // Which account was affected
  entryType: 'debit' | 'credit';                      // Debit = money leaving, Credit = money entering
  amount: number;                                      // ALWAYS in paise (integer)
  balanceBefore: number;                               // Balance before this entry (paise)
  balanceAfter: number;                                // Balance after this entry (paise)
  createdAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD SIGNAL — One result from one fraud rule
// Each rule that fires creates one row in the fraud_signals table
// Used for audit trail and future ML training data
// ─────────────────────────────────────────────────────────────────────────────
export interface IFraudSignal {
  id: string;                                          // UUID primary key
  transactionId: string;                               // References transactions.id
  ruleName: string;                                    // e.g. "VELOCITY_CHECK", "AMOUNT_ANOMALY"
  scoreAdded: number;                                  // Points this rule contributed (e.g. 25)
  signalData: Record<string, unknown>;                 // Rule-specific context (JSONB)
  createdAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD RESULT — Combined output from the fraud engine after running all 6 rules
// This is returned to payment-service to decide approve/decline
// ─────────────────────────────────────────────────────────────────────────────
export interface IFraudResult {
  score: number;                                       // Total score 0-100 (capped at 100)
  action: 'approve' | 'review' | 'challenge' | 'decline';  // Decision based on score
  signals: IFraudSignal[];                             // Array of all signals (including ones that didn't fire)
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD ENGINE INPUT — What fraud-service needs to run its 6 rules
// ─────────────────────────────────────────────────────────────────────────────
export interface IFraudInput {
  fromAccountId: string;                               // Sender's account UUID
  toAccountId: string;                                 // Recipient's account UUID
  amount: number;                                      // Transfer amount in paise
  accountCreatedAt: Date;                              // When sender's account was created
  traceId: string;                                     // For correlation across services
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK ENDPOINT — A URL registered by a merchant to receive event notifications
// Maps to the "webhook_endpoints" table in PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
export interface IWebhookEndpoint {
  id: string;                                          // UUID primary key
  userId: string;                                      // Who registered this endpoint
  url: string;                                         // The URL to POST events to
  secret: string;                                      // HMAC-SHA256 signing secret — never expose in GET responses
  events: string[];                                    // e.g. ['payment.completed', 'payment.failed']
  isActive: boolean;                                   // Soft disable flag
  createdAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK DELIVERY — One delivery attempt (including retries) for a webhook event
// Maps to the "webhook_deliveries" table in PostgreSQL
// Status flow: pending → delivered | retrying → failed
// ─────────────────────────────────────────────────────────────────────────────
export interface IWebhookDelivery {
  id: string;                                          // UUID primary key
  endpointId: string;                                  // References webhook_endpoints.id
  transactionId: string | null;                        // References transactions.id (if applicable)
  eventType: string;                                   // e.g. 'payment.completed'
  payload: Record<string, unknown>;                    // The JSON body sent to the webhook URL
  status: 'pending' | 'delivered' | 'retrying' | 'failed';
  attemptNumber: number;                               // Current attempt (1-5)
  responseCode: number | null;                         // HTTP status code from the endpoint
  responseBody: string | null;                         // Response text from the endpoint
  nextRetryAt: string | null;                          // ISO 8601 — when to retry next
  deliveredAt: string | null;                          // ISO 8601 — when successfully delivered
  createdAt: string;                                   // ISO 8601 timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// KAFKA EVENT ENVELOPE — Standard wrapper for all events published to Kafka
// Every event in every topic uses this exact shape
// ─────────────────────────────────────────────────────────────────────────────
export interface IKafkaEvent<T = unknown> {
  eventId: string;                                     // UUID — unique per event, for deduplication
  eventType: string;                                   // Topic name (e.g. 'payment.completed')
  timestamp: string;                                   // ISO 8601 — new Date().toISOString()
  version: '1.0';                                      // Schema version for future migrations
  traceId: string;                                     // Correlates all events from one user request
  data: T;                                             // The actual event payload
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SERVICE — Input parameters for initiating a transfer
// This is what the handler passes to payment.service.initiatePayment()
// ─────────────────────────────────────────────────────────────────────────────
export interface IInitiatePaymentParams {
  idempotencyKey: string;                              // Client-generated UUID for duplicate detection
  fromAccountId: string;                               // Sender's account UUID
  toAccountId: string;                                 // Recipient's account UUID
  amount: number;                                      // Amount in paise (integer, positive)
  currency: 'INR';                                     // Only INR supported
  description?: string;                                // Optional memo (max 255 chars)
  userId: string;                                      // Authenticated user ID from JWT
  traceId: string;                                     // Request trace ID for logs
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER SERVICE — Parameters for creating the debit/credit pair
// ─────────────────────────────────────────────────────────────────────────────
export interface ILedgerParams {
  transactionId: string;                               // The transaction these entries belong to
  fromAccountId: string;                               // Sender's account UUID
  toAccountId: string;                                 // Recipient's account UUID
  amount: number;                                      // Amount in paise
  fromBalanceBefore: number;                           // Sender's balance before debit
  fromBalanceAfter: number;                            // Sender's balance after debit
  toBalanceBefore: number;                             // Recipient's balance before credit
  toBalanceAfter: number;                              // Recipient's balance after credit
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE — Standard shape for ALL API responses (success and error)
// Every route handler must return this shape — no exceptions
// ─────────────────────────────────────────────────────────────────────────────
export interface IApiResponse<T = null> {
  success: boolean;                                    // true for success, false for error
  data?: T;                                            // The response payload (only on success)
  error?: string;                                      // Error code in SCREAMING_SNAKE_CASE
  message?: string;                                    // Human-readable message
  traceId: string;                                     // For debugging — correlates all logs
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT — Internal service return type (not sent to client directly)
// Services return this to handlers, handlers convert to API response
// ─────────────────────────────────────────────────────────────────────────────
export interface IResult<T> {
  success: boolean;                                    // Whether the operation succeeded
  data?: T;                                            // The result payload
  error?: string;                                      // Error code
  message?: string;                                    // Human-readable description
  statusCode?: number;                                 // HTTP status code suggestion
  fromCache?: boolean;                                 // True when result came from idempotency cache
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS AUGMENTATION — Adds custom properties to Express Request
// auth.middleware adds userId, requestId.middleware adds traceId
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      userId?: string;                                 // Set by auth.middleware after JWT verification
      traceId: string;                                 // Set by requestId.middleware — UUID per request
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KAFKA TOPIC CONSTANTS — All 7 topics used in the Settlr event bus
// Import these instead of using string literals to prevent typos
// ─────────────────────────────────────────────────────────────────────────────
export const KafkaTopics = {
  PAYMENT_INITIATED: 'payment.initiated',              // payment-service → fraud-service
  PAYMENT_COMPLETED: 'payment.completed',              // payment-service → webhook-service, notification-service
  PAYMENT_FAILED: 'payment.failed',                    // payment-service → webhook-service, notification-service
  PAYMENT_FRAUD_BLOCKED: 'payment.fraud_blocked',      // payment-service → notification-service
  FRAUD_CHECK_REQUESTED: 'fraud.check.requested',      // payment-service → fraud-service
  FRAUD_CHECK_RESULT: 'fraud.check.result',            // fraud-service → payment-service
  WEBHOOK_DELIVERY_FAILED: 'webhook.delivery.failed',  // webhook-service → notification-service
} as const;

/** Union type of all valid Kafka topic strings */
export type KafkaTopic = typeof KafkaTopics[keyof typeof KafkaTopics];

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Parameters for registration, login, and token management
// Used by api-gateway auth routes and account-service
// ─────────────────────────────────────────────────────────────────────────────

/** What the client sends when registering a new user */
export interface IRegisterParams {
  email: string;                                       // Must be valid email format
  password: string;                                    // Min 8 chars, will be bcrypt hashed (salt ≥ 12)
  phone?: string;                                      // Optional phone number
}

/** What the client sends when logging in */
export interface ILoginParams {
  email: string;                                       // Registered email address
  password: string;                                    // Plain text — verified against bcrypt hash
}

/** JWT payload embedded inside both access and refresh tokens */
export interface IJwtPayload {
  userId: string;                                      // user.id (UUID)
  email: string;                                       // user.email
  iat?: number;                                        // Issued at (set by jsonwebtoken)
  exp?: number;                                        // Expiration (set by jsonwebtoken)
}

/** What login and register endpoints return on success */
export interface IAuthTokens {
  accessToken: string;                                 // Short-lived JWT (15 min default)
  refreshToken: string;                                // Long-lived token (7 days default)
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT — Parameters for creating a new financial account
// ─────────────────────────────────────────────────────────────────────────────

/** What the handler passes to account.service.createAccount() */
export interface ICreateAccountParams {
  userId: string;                                      // Authenticated user ID from JWT
  currency: 'INR';                                     // Only INR supported
  initialBalance?: number;                             // Optional starting balance in paise (default 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION — Standard params and response shape for paginated endpoints
// Used by: GET /accounts/:id/transactions, GET /accounts/:id/ledger
// ─────────────────────────────────────────────────────────────────────────────

/** Query parameters for any paginated list endpoint */
export interface IPaginationParams {
  page: number;                                        // 1-indexed page number
  limit: number;                                       // Items per page (default 20, max 100)
}

/** Standard paginated response wrapper — wraps array of items with metadata */
export interface IPaginatedResponse<T> {
  items: T[];                                          // Array of results for the current page
  total: number;                                       // Total matching items across all pages
  page: number;                                        // Current page number (1-indexed)
  limit: number;                                       // Items per page
  totalPages: number;                                  // Math.ceil(total / limit)
  hasMore: boolean;                                    // true if there are more pages after this one
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN METRICS — Data shape returned by GET /api/v1/admin/metrics
// Consumed by the AdminPage on the frontend dashboard
// ─────────────────────────────────────────────────────────────────────────────
export interface IAdminMetrics {
  totalVolumeToday: number;                            // Total paise transferred today
  successRate: number;                                 // 0-100 percentage of completed transactions
  fraudBlockRate: number;                              // 0-100 percentage blocked by fraud engine
  avgLatencyMs: number;                                // Average payment processing time in milliseconds
  transactionsPerMinute: number[];                     // Last 30 data points for the chart
  signalBreakdown: ISignalBreakdown[];                 // Fraud signal counts grouped by rule name
}

/** One row in the fraud signal breakdown chart on the admin page */
export interface ISignalBreakdown {
  ruleName: string;                                    // e.g. 'VELOCITY_CHECK'
  count: number;                                       // How many times this rule fired today
}

// ─────────────────────────────────────────────────────────────────────────────
// MONEY UTILITIES — Pure functions for converting between paise and display strings
// Used across both backend (API responses) and frontend (formatCurrency.ts)
// ALL money logic uses paise (integer). These are the ONLY places division happens.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts paise (integer) to a formatted Indian Rupee string.
 * Uses Intl.NumberFormat for proper Indian number system formatting.
 *
 * Example: formatPaise(9950)     → "₹99.50"
 * Example: formatPaise(100000)   → "₹1,000.00"
 * Example: formatPaise(10000000) → "₹1,00,000.00"
 */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

/**
 * Converts a rupee string (e.g. user input "99.50") to paise integer.
 * Uses Math.round to avoid floating point errors (e.g. 99.50 * 100 = 9949.999...)
 *
 * Example: parseToPaise("99.50") → 9950
 * Example: parseToPaise("1000")  → 100000
 */
export function parseToPaise(rupeesString: string): number {
  return Math.round(parseFloat(rupeesString) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ROW TYPE UTILITIES — Convert between DB snake_case and TS camelCase
// Repositories return raw DB rows in snake_case. These helpers type the conversion.
// ─────────────────────────────────────────────────────────────────────────────

/** Raw user row as it comes from PostgreSQL (snake_case column names) */
export interface IUserRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  password_hash: string;
  kyc_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Raw account row as it comes from PostgreSQL (snake_case column names) */
export interface IAccountRow {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Raw transaction row as it comes from PostgreSQL (snake_case column names) */
export interface ITransactionRow {
  id: string;
  idempotency_key: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  fraud_score: number | null;
  fraud_action: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Raw ledger entry row as it comes from PostgreSQL (snake_case column names) */
export interface ILedgerEntryRow {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

/** Raw fraud signal row as it comes from PostgreSQL (snake_case column names) */
export interface IFraudSignalRow {
  id: string;
  transaction_id: string;
  rule_name: string;
  score_added: number;
  signal_data: Record<string, unknown>;
  created_at: string;
}

/** Raw webhook endpoint row as it comes from PostgreSQL (snake_case column names) */
export interface IWebhookEndpointRow {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

/** Raw webhook delivery row as it comes from PostgreSQL (snake_case column names) */
export interface IWebhookDeliveryRow {
  id: string;
  endpoint_id: string;
  transaction_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempt_number: number;
  response_code: number | null;
  response_body: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

/**
 * Converts a snake_case DB row object to camelCase.
 * Handles nested objects and arrays recursively.
 * Used in repositories before returning data to services.
 *
 * Example: toCamelCase({ user_id: '123', created_at: '...' })
 *        → { userId: '123', createdAt: '...' }
 */
export function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Converts a camelCase object to snake_case for INSERT/UPDATE queries.
 * Used in repositories when writing data to the database.
 *
 * Example: toSnakeCase({ userId: '123', createdAt: '...' })
 *        → { user_id: '123', created_at: '...' }
 */
export function toSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}
