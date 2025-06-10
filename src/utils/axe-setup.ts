/**
 * AXe Availability Check - Checks if axe tool is available
 *
 * This utility module provides functions to check if AXe tool
 * is available in the system PATH or bundled with the package.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createTextResponse } from './validation.js';
import { ToolResponse } from '../types/common.js';

// Constants
const AXE_COMMAND = 'axe';

// Get package directory for bundled binary
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..', '..');
const bundledAxePath = join(packageRoot, 'bundled', 'axe');

/**
 * Check if a binary is available in the PATH
 */
function isBinaryAvailable(binary: string): boolean {
  try {
    execSync(`which ${binary}`, { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to the axe binary, preferring installed version over bundled
 */
export function getAxePath(): string | null {
  // First check if axe is installed in PATH
  if (isBinaryAvailable(AXE_COMMAND)) {
    return AXE_COMMAND;
  }

  // Fall back to bundled version if available
  if (existsSync(bundledAxePath)) {
    return bundledAxePath;
  }

  return null;
}

/**
 * Get environment variables needed for bundled AXe to run
 */
export function getBundledAxeEnvironment(): Record<string, string> {
  const bundledFrameworksPath = join(packageRoot, 'bundled', 'Frameworks');

  // Set DYLD_FRAMEWORK_PATH to find bundled frameworks
  return {
    DYLD_FRAMEWORK_PATH: bundledFrameworksPath,
  };
}

/**
 * Check if axe tool is available (either installed or bundled)
 */
export function areAxeToolsAvailable(): boolean {
  return getAxePath() !== null;
}

export function createAxeNotAvailableResponse(): ToolResponse {
  return createTextResponse(
    'axe command not found. UI automation features are not available.\n\n' +
      'To install axe, run:\n' +
      'brew tap cameroncooke/axe\n' +
      'brew install axe\n\n' +
      'See section "Enabling UI Automation" in the README.',
    true,
  );
}
