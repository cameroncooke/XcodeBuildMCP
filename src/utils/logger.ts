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
 * Log a message with the specified level
 * @param level The log level (info, warning, error, debug)
 * @param message The message to log
 */
export function log(level: string, message: string): void {
  // Suppress logging during tests to keep test output clean
  if (
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.XCODEBUILDMCP_SILENCE_LOGS === 'true'
  ) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (level === 'error' && SENTRY_ENABLED) {
    withSentry((s) => s.captureMessage(logMessage));
  }

  // It's important to use console.error here to ensure logs don't interfere with MCP protocol communication
  // see https://modelcontextprotocol.io/docs/tools/debugging#server-side-logging
  console.error(logMessage);
}
