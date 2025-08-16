/**
 * AXe Helper Functions
 *
 * This utility module provides functions to work with the bundled AXe tool.
 * Always uses the bundled version to ensure consistency.
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createTextResponse } from './validation.ts';
import { ToolResponse } from '../types/common.ts';

// Get bundled AXe path - always use the bundled version for consistency
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// In the npm package, build/index.js is at the same level as bundled/
// So we go up one level from build/ to get to the package root
const bundledAxePath = join(__dirname, '..', 'bundled', 'axe');

/**
 * Get the path to the bundled axe binary
 */
export function getAxePath(): string | null {
  // Always use bundled version for consistency
  if (existsSync(bundledAxePath)) {
    return bundledAxePath;
  }
  return null;
}

/**
 * Get environment variables needed for bundled AXe to run
 */
export function getBundledAxeEnvironment(): Record<string, string> {
  // No special environment variables needed - bundled AXe binary
  // has proper @rpath configuration to find frameworks
  return {};
}

/**
 * Check if bundled axe tool is available
 */
export function areAxeToolsAvailable(): boolean {
  return getAxePath() !== null;
}

export function createAxeNotAvailableResponse(): ToolResponse {
  return createTextResponse(
    'Bundled axe tool not found. UI automation features are not available.\n\n' +
      'This is likely an installation issue with the npm package.\n' +
      'Please reinstall xcodebuildmcp or report this issue.',
    true,
  );
}
