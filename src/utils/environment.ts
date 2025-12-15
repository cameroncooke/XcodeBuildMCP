/**
 * Environment Detection Utilities
 *
 * Provides abstraction for environment detection to enable testability
 * while maintaining production functionality.
 */

import { execSync } from 'child_process';
import { log } from './logger.ts';

/**
 * Interface for environment detection abstraction
 */
export interface EnvironmentDetector {
  /**
   * Detects if the MCP server is running under Claude Code
   * @returns true if Claude Code is detected, false otherwise
   */
  isRunningUnderClaudeCode(): boolean;
}

/**
 * Production implementation of environment detection
 */
export class ProductionEnvironmentDetector implements EnvironmentDetector {
  isRunningUnderClaudeCode(): boolean {
    // Disable Claude Code detection during tests for environment-agnostic testing
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return false;
    }

    // Method 1: Check for Claude Code environment variables
    if (process.env.CLAUDECODE === '1' || process.env.CLAUDE_CODE_ENTRYPOINT === 'cli') {
      return true;
    }

    // Method 2: Check parent process name
    try {
      const parentPid = process.ppid;
      if (parentPid) {
        const parentCommand = execSync(`ps -o command= -p ${parentPid}`, {
          encoding: 'utf8',
          timeout: 1000,
        }).trim();
        if (parentCommand.includes('claude')) {
          return true;
        }
      }
    } catch (error) {
      // If process detection fails, fall back to environment variables only
      log('debug', `Failed to detect parent process: ${error}`);
    }

    return false;
  }
}

/**
 * Default environment detector instance for production use
 */
export const defaultEnvironmentDetector = new ProductionEnvironmentDetector();

/**
 * Gets the default environment detector for production use
 */
export function getDefaultEnvironmentDetector(): EnvironmentDetector {
  return defaultEnvironmentDetector;
}

/**
 * Global opt-out for session defaults in MCP tool schemas.
 * When enabled, tools re-expose all parameters instead of hiding session-managed fields.
 */
export function isSessionDefaultsSchemaOptOutEnabled(): boolean {
  const raw = process.env.XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS;
  if (!raw) return false;

  const normalized = raw.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

/**
 * Normalizes a set of user-provided environment variables by ensuring they are
 * prefixed with TEST_RUNNER_. Variables already prefixed are preserved.
 *
 * Example:
 *  normalizeTestRunnerEnv({ FOO: '1', TEST_RUNNER_BAR: '2' })
 *  => { TEST_RUNNER_FOO: '1', TEST_RUNNER_BAR: '2' }
 */
export function normalizeTestRunnerEnv(vars: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars ?? {})) {
    if (value == null) continue;
    const prefixedKey = key.startsWith('TEST_RUNNER_') ? key : `TEST_RUNNER_${key}`;
    normalized[prefixedKey] = value;
  }
  return normalized;
}
