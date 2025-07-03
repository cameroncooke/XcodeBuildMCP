/**
 * Utilities Plugin: Clean Workspace
 * 
 * Cleans build products for a specific workspace using xcodebuild.
 */

import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { XcodePlatform } from '../../src/utils/index.js';
import { executeXcodeBuildCommand } from '../../src/utils/index.js';
import { validateRequiredParam } from '../../src/utils/index.js';

const CleanWorkspaceSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().optional().describe('Optional: The scheme to clean'),
  configuration: z
    .string()
    .optional()
    .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Optional: Path where derived data might be located'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
});

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

async function cleanWorkspace(params) {
  const validated = CleanWorkspaceSchema.parse(params);

  const workspacePathValidation = validateRequiredParam('workspacePath', validated.workspacePath);
  if (!workspacePathValidation.isValid) {
    return workspacePathValidation.errorResponse;
  }

  return _handleCleanLogic(validated);
}

export default {
  name: 'clean_ws',
  description: 'Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: \'/path/to/MyProject.xcworkspace\', scheme: \'MyScheme\' })',
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().optional().describe('Optional: The scheme to clean'),
    configuration: z
      .string()
      .optional()
      .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Optional: Path where derived data might be located'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  },
  async handler(args: any) {
    const params = args;
    return cleanWorkspace(params);
  },
};