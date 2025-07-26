/**
 * Environment Detection Utilities
 *
 * Provides abstraction for environment detection to enable testability
 * while maintaining production functionality.
 */

import { execSync } from 'child_process';
import { log } from './logger.js';

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
