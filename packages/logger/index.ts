// Structured JSON logger — replaces console.log everywhere. Outputs { level, message, timestamp, service, ...context }.
// NEVER use console.log in any service. Always import { logger } from '@settlr/logger'.
// Every log line is valid JSON so log aggregators (Datadog, CloudWatch, Grafana) can parse and search them.
//
// Import path: import { logger, createServiceLogger } from '@settlr/logger';
//
// Usage:
//   const log = createServiceLogger('payment-service');
//   log.info('payment_initiated', { trace_id: req.traceId, amount: 5000 });
//   log.error('payment_failed', { trace_id: req.traceId, error: err.message, stack: err.stack });

/** Allowed log levels, ordered from most verbose to most critical */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Numeric priority for each level — only logs at or above the configured level are printed */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Read the minimum log level from environment — defaults to 'info' in production */
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/**
 * List of sensitive field names that should be redacted in log output.
 * If any of these keys appear at the top level of the context object,
 * their values are replaced with '[REDACTED]'.
 * This prevents accidentally logging passwords, tokens, or secrets.
 */
const SENSITIVE_FIELDS = new Set([
  'password', 'passwordHash', 'password_hash',
  'secret', 'token', 'accessToken', 'refreshToken',
  'authorization', 'jwt', 'apiKey', 'api_key',
]);

/**
 * Replaces values of known sensitive fields with '[REDACTED]'.
 * Only checks top-level keys (not recursive) for performance.
 * Does NOT mutate the original object — returns a shallow copy.
 */
function redactSensitiveFields(context: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    redacted[key] = SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : value;
  }
  return redacted;
}

/**
 * Writes a single structured JSON log line to stdout/stderr.
 * Each line includes level, message, ISO timestamp, and any extra context fields.
 * Uses process.stdout.write instead of console.log to avoid recursion if someone
 * accidentally wraps console.log.
 *
 * Output format (one line):
 *   {"level":"info","message":"payment_initiated","timestamp":"2026-02-18T10:30:00.000Z","trace_id":"abc","amount":5000}
 */
function writeLog(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {},
  defaultContext: Record<string, unknown> = {}
): void {
  // Skip logs below the configured minimum level
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

  // Merge default context (e.g. service name) with per-call context
  // Redact sensitive fields before writing
  const mergedContext = redactSensitiveFields({ ...defaultContext, ...context });

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...mergedContext,
  };

  const output = JSON.stringify(entry) + '\n';

  // Errors go to stderr, everything else to stdout
  if (level === 'error') {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
}

/**
 * Interface for the logger object — shared by both the default logger and child loggers.
 * Every logger has exactly these 4 methods, one per log level.
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Creates a logger methods object with the given default context.
 * Every log call will automatically include these default fields.
 * Used by both the global logger (no defaults) and service loggers (with service name).
 */
function createLoggerMethods(defaultContext: Record<string, unknown> = {}): ILogger {
  return {
    /** Verbose debugging info — only shown when LOG_LEVEL=debug */
    debug(message: string, context?: Record<string, unknown>): void {
      writeLog('debug', message, context, defaultContext);
    },

    /** Normal operational events — service started, request handled, etc. */
    info(message: string, context?: Record<string, unknown>): void {
      writeLog('info', message, context, defaultContext);
    },

    /** Something unexpected but recoverable — e.g. retry needed, validation failed */
    warn(message: string, context?: Record<string, unknown>): void {
      writeLog('warn', message, context, defaultContext);
    },

    /** Something broke — unhandled error, DB connection failed, etc. */
    error(message: string, context?: Record<string, unknown>): void {
      writeLog('error', message, context, defaultContext);
    },
  };
}

/**
 * The default global logger — no service name attached.
 * Use this in shared packages (packages/*) where the service name isn't known.
 *
 * Usage:
 *   import { logger } from '@settlr/logger';
 *   logger.info('database_connected', { host: 'localhost' });
 */
export const logger: ILogger = createLoggerMethods();

/**
 * Creates a child logger with a service name automatically added to every log line.
 * Use this in service index.ts files to create a service-scoped logger.
 *
 * Usage:
 *   import { createServiceLogger } from '@settlr/logger';
 *   const logger = createServiceLogger('payment-service');
 *   logger.info('service_started', { port: 3002 });
 *   // Output: {"level":"info","message":"service_started","timestamp":"...","service":"payment-service","port":3002}
 */
export function createServiceLogger(serviceName: string): ILogger {
  return createLoggerMethods({ service: serviceName });
}

/**
 * Creates a request-scoped logger that includes both service name and trace ID.
 * Attach this to req in requestId middleware so handlers can do req.log.info('...')
 *
 * Usage (in middleware):
 *   req.log = createRequestLogger('payment-service', req.traceId);
 *
 * Usage (in handler):
 *   req.log.info('handler_called', { accountId: req.params.id });
 *   // Output: {...,"service":"payment-service","trace_id":"abc-123","accountId":"..."}
 */
export function createRequestLogger(serviceName: string, traceId: string): ILogger {
  return createLoggerMethods({ service: serviceName, trace_id: traceId });
}
