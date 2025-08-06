/**
 * Utilities Plugin: Clean Workspace
 *
 * Cleans build products for a specific workspace using xcodebuild.
 */

import { z } from 'zod';
import { log, getDefaultCommandExecutor, executeXcodeBuildCommand } from '../../../utils/index.js';
import { XcodePlatform } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const cleanWsSchema = z.object({
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

// Use z.infer for type safety
type CleanWsParams = z.infer<typeof cleanWsSchema>;

export async function clean_wsLogic(
  params: CleanWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Starting xcodebuild clean request (internal)');

  // For clean operations, we need to provide a default platform and configuration
  return executeXcodeBuildCommand(
    {
      ...params,
      scheme: params.scheme ?? '', // Empty string if not provided
      configuration: params.configuration ?? 'Debug', // Default to Debug if not provided
    },
    {
      platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
      logPrefix: 'Clean',
    },
    false,
    'clean', // Specify 'clean' as the build action
    executor,
  );
}

export default {
  name: 'clean_ws',
  description:
    "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
  schema: cleanWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(cleanWsSchema, clean_wsLogic, getDefaultCommandExecutor),
};
