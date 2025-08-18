/**
 * Logger Utility - Simple logging implementation for the application
 *
 * This utility module provides a lightweight logging system that directs log
 * messages to stderr rather than stdout, ensuring they don't interfere with
 * the MCP protocol communication which uses stdout.
 *
 * Responsibilities:
 * - Formatting log messages with timestamps and level indicators
 * - Directing all logs to stderr to avoid MCP protocol interference
 * - Supporting different log levels (info, warning, error, debug)
 * - Providing a simple, consistent logging interface throughout the application
 * - Sending error-level logs to Sentry for monitoring and alerting
 *
 * While intentionally minimal, this logger provides the essential functionality
 * needed for operational monitoring and debugging throughout the application.
 * It's used by virtually all other modules for status reporting and error logging.
 */

import { createRequire } from 'node:module';
// Note: Removed "import * as Sentry from '@sentry/node'" to prevent native module loading at import time

const SENTRY_ENABLED =
  process.env.SENTRY_DISABLED !== 'true' && process.env.XCODEBUILDMCP_SENTRY_DISABLED !== 'true';

// Log levels in order of severity (lower number = more severe)
const LOG_LEVELS = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Optional context for logging to control Sentry capture
 */
export interface LogContext {
  sentry?: boolean;
}

// Client-requested log level (null means no filtering)
let clientLogLevel: LogLevel | null = null;

function isTestEnv(): boolean {
  return (
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.XCODEBUILDMCP_SILENCE_LOGS === 'true'
  );
}

type SentryModule = typeof import('@sentry/node');

const require = createRequire(import.meta.url);
let cachedSentry: SentryModule | null = null;

function loadSentrySync(): SentryModule | null {
  if (!SENTRY_ENABLED || isTestEnv()) return null;
  if (cachedSentry) return cachedSentry;
  try {
    cachedSentry = require('@sentry/node') as SentryModule;
    return cachedSentry;
  } catch {
    // If @sentry/node is not installed in some environments, fail silently.
    return null;
  }
}

function withSentry(cb: (s: SentryModule) => void): void {
  const s = loadSentrySync();
  if (!s) return;
  try {
    cb(s);
  } catch {
    // no-op: avoid throwing inside logger
  }
}

if (!SENTRY_ENABLED) {
  if (process.env.SENTRY_DISABLED === 'true') {
    log('info', 'Sentry disabled due to SENTRY_DISABLED environment variable');
  } else if (process.env.XCODEBUILDMCP_SENTRY_DISABLED === 'true') {
    log('info', 'Sentry disabled due to XCODEBUILDMCP_SENTRY_DISABLED environment variable');
  }
}

/**
 * Set the minimum log level for client-requested filtering
 * @param level The minimum log level to output
 */
export function setLogLevel(level: LogLevel): void {
  clientLogLevel = level;
  log('debug', `Log level set to: ${level}`);
}

/**
 * Get the current client-requested log level
 * @returns The current log level or null if no filtering is active
 */
export function getLogLevel(): LogLevel | null {
  return clientLogLevel;
}

/**
 * Check if a log level should be output based on client settings
 * @param level The log level to check
 * @returns true if the message should be logged
 */
function shouldLog(level: string): boolean {
  // Suppress logging during tests to keep test output clean
  if (isTestEnv()) {
    return false;
  }

  // If no client level set, log everything
  if (clientLogLevel === null) {
    return true;
  }

  // Check if the level is valid
  const levelKey = level.toLowerCase() as LogLevel;
  if (!(levelKey in LOG_LEVELS)) {
    return true; // Log unknown levels
  }

  // Only log if the message level is at or above the client's requested level
  return LOG_LEVELS[levelKey] <= LOG_LEVELS[clientLogLevel];
}

/**
 * Log a message with the specified level
 * @param level The log level (emergency, alert, critical, error, warning, notice, info, debug)
 * @param message The message to log
 * @param context Optional context to control Sentry capture and other behavior
 */
export function log(level: string, message: string, context?: LogContext): void {
  // Check if we should log this level
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  // Default: error level goes to Sentry
  // But respect explicit override from context
  const captureToSentry = SENTRY_ENABLED && (context?.sentry ?? level === 'error');

  if (captureToSentry) {
    withSentry((s) => s.captureMessage(logMessage));
  }

  // It's important to use console.error here to ensure logs don't interfere with MCP protocol communication
  // see https://modelcontextprotocol.io/docs/tools/debugging#server-side-logging
  console.error(logMessage);
}
