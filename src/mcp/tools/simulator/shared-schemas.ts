/**
 * Shared Schema Definitions for Simulator Tools
 *
 * This module contains common Zod schema definitions used across multiple simulator tools
 * to eliminate duplication and ensure consistency.
 */

import { z } from 'zod';

/**
 * Common simulator options shared across build_sim, build_run_sim, and test_sim tools.
 * These options are consistent across all simulator-based workflows.
 */
export const simulatorCommonOptions = {
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z
    .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .optional()
    .default('iOS Simulator')
    .describe('Target simulator platform (defaults to iOS Simulator)'),
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('Whether to use the latest OS version for the named simulator'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe(
      'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
    ),
};

/**
 * Project and workspace path options.
 * These are mutually exclusive - provide one or the other, not both.
 */
export const projectWorkspaceOptions = {
  projectPath: z
    .string()
    .optional()
    .describe('Path to .xcodeproj file. Provide EITHER this OR workspacePath, not both'),
  workspacePath: z
    .string()
    .optional()
    .describe('Path to .xcworkspace file. Provide EITHER this OR projectPath, not both'),
};
