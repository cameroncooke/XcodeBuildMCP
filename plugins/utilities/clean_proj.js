/**
 * Utilities Plugin: Clean Project
 * 
 * Cleans build products and intermediate files from a project.
 */

import { z } from 'zod';
import { log } from '../../build/utils.js';
import { XcodePlatform } from '../../build/utils.js';
import { executeXcodeBuildCommand } from '../../build/utils.js';
import { validateRequiredParam } from '../../build/utils.js';

// Internal logic for cleaning build products.
async function _handleCleanLogic(params) {
  log('info', 'Starting xcodebuild clean request (internal)');

  // For clean operations, we need to provide a default platform and configuration
  return executeXcodeBuildCommand(
    {
      ...params,
      scheme: params.scheme || '', // Empty string if not provided
      configuration: params.configuration || 'Debug', // Default to Debug if not provided
    },
    {
      platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
      logPrefix: 'Clean',
    },
    false,
    'clean', // Specify 'clean' as the build action
  );
}

// Cleans build products for a project
async function cleanProject(params) {
  const validated = z.object({
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().optional().describe('The scheme to clean'),
    configuration: z
      .string()
      .optional()
      .describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z.boolean().optional().describe('If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.'),
  }).parse(params);

  const projectPathValidation = validateRequiredParam('projectPath', validated.projectPath);
  if (!projectPathValidation.isValid) {
    return projectPathValidation.errorResponse;
  }

  return _handleCleanLogic(validated);
}

export default {
  name: 'clean_proj',
  description: 'Cleans build products and intermediate files from a project. IMPORTANT: Requires projectPath. Example: clean_proj({ projectPath: \'/path/to/MyProject.xcodeproj\', scheme: \'MyScheme\' })',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().optional().describe('The scheme to clean'),
    configuration: z
      .string()
      .optional()
      .describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z.boolean().optional().describe('If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.'),
  },
  async handler(params) {
    return cleanProject(params);
  },
};