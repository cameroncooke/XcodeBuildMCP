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
import type { CommandExecutor } from './execution/index.ts';
import { getDefaultCommandExecutor } from './execution/index.ts';

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

/**
 * Compare two semver strings a and b.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = Number.isFinite(pa[i]) ? pa[i] : 0;
    const db = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

/**
 * Determine whether the bundled AXe meets a minimum version requirement.
 * Runs `axe --version` and parses a semantic version (e.g., "1.1.0").
 * If AXe is missing or the version cannot be parsed, returns false.
 */
export async function isAxeAtLeastVersion(
  required: string,
  executor?: CommandExecutor,
  deps?: { getAxePath: () => string | null },
): Promise<boolean> {
  const axePath = (deps?.getAxePath ?? getAxePath)();
  if (!axePath) return false;

  const exec = executor ?? getDefaultCommandExecutor();
  try {
    const res = await exec([axePath, '--version'], 'AXe Version', true);
    if (!res.success) return false;

    const output = res.output ?? '';
    // Prefer a version number that follows the 'AXe' token, allowing an optional 'v' prefix (e.g., "AXe v1.1.0")
    const preferred = output.match(/\bAXe(?:\s+version)?\s+v?(\d+\.\d+\.\d+)\b/i);
    let detected: string | null = preferred ? preferred[1] : null;

    if (!detected) {
      // Fallback: scan all semver-looking tokens and pick the highest
      // Fallback: match any semver with optional leading 'v', avoiding alphanumeric adjacency
      const all = [...output.matchAll(/(?:^|[^A-Za-z0-9_.-])v?(\d+\.\d+\.\d+)\b/g)].map(
        (m) => m[1],
      );
      if (all.length === 0) return false;
      detected = all.reduce((best, v) => (compareSemver(v, best) > 0 ? v : best), all[0]);
    }

    const current = detected;
    return compareSemver(current, required) >= 0;
  } catch {
    return false;
  }
}
