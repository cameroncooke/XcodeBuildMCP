/**
 * AXe Availability Check - Checks if axe tool is available
 *
 * This utility module provides functions to check if AXe tool
 * is available in the system PATH.
 */

import { execSync } from 'child_process';
import { createTextResponse } from './validation.js';
import { ToolResponse } from '../types/common.js';

// Constants
const AXE_COMMAND = 'axe';

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
 * Check if axe tool is available
 */
export function areAxeToolsAvailable(): boolean {
  return isBinaryAvailable(AXE_COMMAND);
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
