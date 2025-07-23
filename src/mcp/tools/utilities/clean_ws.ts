/**
 * Utilities Plugin: Clean Workspace
 *
 * Cleans build products for a specific workspace using xcodebuild.
 */

import { z } from 'zod';
import {
  log,
  getDefaultCommandExecutor,
  executeXcodeBuildCommand,
  validateRequiredParam,
} from '../../../utils/index.js';
import { XcodePlatform } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor } from '../../../utils/index.js';

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

export async function clean_wsLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  try {
    const validated = CleanWorkspaceSchema.parse(params);

    const workspacePathValidation = validateRequiredParam('workspacePath', validated.workspacePath);
    if (!workspacePathValidation.isValid) {
      return workspacePathValidation.errorResponse;
    }

    log('info', 'Starting xcodebuild clean request (internal)');

    // For clean operations, we need to provide a default platform and configuration
    return executeXcodeBuildCommand(
      {
        ...validated,
        scheme: validated.scheme || '', // Empty string if not provided
        configuration: validated.configuration || 'Debug', // Default to Debug if not provided
      },
      {
        platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
        logPrefix: 'Clean',
      },
      false,
      'clean', // Specify 'clean' as the build action
      executor,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        content: [
          {
            type: 'text',
            text: `${firstError.message} at path '${firstError.path.join('.')}'`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}

export default {
  name: 'clean_ws',
  description:
    "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
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
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return clean_wsLogic(args, getDefaultCommandExecutor());
  },
};
