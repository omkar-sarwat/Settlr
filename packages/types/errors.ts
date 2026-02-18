// AppError class and typed ErrorCodes constant — imported by every service for consistent error handling.
// Services throw AppError for expected errors (invalid input, not found, etc.)
// The global error handler middleware catches these and converts them to JSON API responses.
// Import path: import { AppError, ErrorCodes } from '@settlr/types';
// Or:          import { AppError, ErrorCodes } from '@settlr/types/errors';

/**
 * Custom error class for all expected (operational) errors in Settlr.
 * Distinguishes operational errors from programmer bugs.
 * - Operational errors (isOperational = true): missing account, bad input, etc.
 * - Programmer errors: thrown by runtime (TypeError, ReferenceError) — let them crash.
 *
 * Usage:
 *   throw new AppError(ErrorCodes.INSUFFICIENT_BALANCE, 'Not enough paise in account', 422);
 *   throw new AppError(ErrorCodes.UNAUTHORIZED, 'Missing or invalid JWT', 401);
 *   throw AppError.notFound('Account', accountId);  // convenience factory
 */
export class AppError extends Error {
  public readonly code: string;          // SCREAMING_SNAKE_CASE error code (e.g. 'INSUFFICIENT_BALANCE')
  public readonly statusCode: number;    // HTTP status code to return (e.g. 400, 404, 500)
  public readonly isOperational: boolean; // true = expected error, false = programmer bug

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true; // All AppErrors are operational by definition
    // Capture stack trace but exclude the constructor from it (cleaner traces)
    Error.captureStackTrace(this, this.constructor);
    // Set the prototype explicitly for proper instanceof checks after transpilation
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // ── Factory Methods ─────────────────────────────────────────────────────
  // Convenience methods for the most common error patterns.
  // Using these ensures consistent messages and correct status codes.

  /** Creates a 404 Not Found error with a standard message format */
  static notFound(resource: string, id: string): AppError {
    return new AppError(
      ErrorCodes.ACCOUNT_NOT_FOUND,
      `${resource} with id '${id}' not found`,
      404
    );
  }

  /** Creates a 401 Unauthorized error */
  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(ErrorCodes.UNAUTHORIZED, message, 401);
  }

  /** Creates a 400 Validation error */
  static validation(message: string): AppError {
    return new AppError(ErrorCodes.VALIDATION_ERROR, message, 400);
  }

  /** Creates a 422 Insufficient Balance error */
  static insufficientBalance(accountId: string, required: number, available: number): AppError {
    return new AppError(
      ErrorCodes.INSUFFICIENT_BALANCE,
      `Account ${accountId} has ${available} paise but ${required} paise required`,
      422
    );
  }

  /** Creates a 403 Fraud Blocked error */
  static fraudBlocked(score: number): AppError {
    return new AppError(
      ErrorCodes.FRAUD_BLOCKED,
      `Transaction declined by risk engine (score: ${score})`,
      403
    );
  }

  /** Creates a 409 Account Locked (busy) error */
  static accountLocked(): AppError {
    return new AppError(
      ErrorCodes.ACCOUNT_LOCKED,
      'Account is busy processing another transaction. Retry in a moment.',
      409
    );
  }

  /** Creates a 429 Rate Limit error */
  static rateLimitExceeded(retryAfterSeconds: number): AppError {
    return new AppError(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      `Too many requests. Retry after ${retryAfterSeconds} seconds.`,
      429
    );
  }
}

/**
 * All error codes used across the entire Settlr backend.
 * Import this constant and use ErrorCodes.INSUFFICIENT_BALANCE instead of string literals.
 * `as const` ensures TypeScript treats the values as string literal types, not just `string`.
 */
export const ErrorCodes = {
  // ── Auth ────────────────────────────────────────
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',      // Wrong email or password
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',                   // JWT has expired
  UNAUTHORIZED: 'UNAUTHORIZED',                     // No token or invalid token

  // ── Account ─────────────────────────────────────
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',           // Account UUID doesn't exist
  RECIPIENT_NOT_FOUND: 'RECIPIENT_NOT_FOUND',       // Recipient account UUID doesn't exist (used in payment flow)
  ACCOUNT_FROZEN: 'ACCOUNT_FROZEN',                 // Account status is 'frozen'
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',                 // Account locked during transaction processing

  // ── Payment ─────────────────────────────────────
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',     // Sender doesn't have enough paise
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',   // Idempotency key already used
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION', // Optimistic lock version mismatch
  FRAUD_BLOCKED: 'FRAUD_BLOCKED',                   // Fraud engine declined the transaction

  // ── Validation ──────────────────────────────────
  VALIDATION_ERROR: 'VALIDATION_ERROR',             // Zod schema validation failed
  INVALID_AMOUNT: 'INVALID_AMOUNT',                 // Amount ≤ 0 or > ₹1 crore

  // ── Rate Limiting ───────────────────────────────
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',       // Too many requests (429)

  // ── System ──────────────────────────────────────
  INTERNAL_ERROR: 'INTERNAL_ERROR',                 // Unexpected server error
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',       // Dependent service is down
} as const;

/** Union type of all valid error code strings — useful for strict typing */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
