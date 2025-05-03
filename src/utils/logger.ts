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

import * as Sentry from '@sentry/node';

/**
 * Log a message with the specified level
 * @param level The log level (info, warning, error, debug)
 * @param message The message to log
 * @param context Optional context data to include with error logs sent to Sentry
 */
export function log(level: string, message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

  // Send error logs to Sentry
  if (level.toLowerCase() === 'error') {
    Sentry.captureMessage(message, {
      level: 'error',
      extra: context,
    });
  }
}
