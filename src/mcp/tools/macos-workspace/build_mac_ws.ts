/**
 * macOS Workspace Plugin: Build macOS Workspace
 *
 * Builds a macOS app using xcodebuild from a workspace.
 */

import { z } from 'zod';
import { log, XcodePlatform } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildMacWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe(
      'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
    ),
});

// Use z.infer for type safety
type BuildMacWsParams = z.infer<typeof buildMacWsSchema>;

/**
 * Core business logic for building macOS apps from workspace
 */
export async function build_mac_wsLogic(
  params: BuildMacWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  const processedParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  return executeXcodeBuildCommand(
    processedParams,
    {
      platform: XcodePlatform.macOS,
      arch: params.arch,
      logPrefix: 'macOS Build',
    },
    processedParams.preferXcodebuild,
    'build',
    executor,
  );
}

export default {
  name: 'build_mac_ws',
  description: 'Builds a macOS app using xcodebuild from a workspace.',
  schema: buildMacWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(buildMacWsSchema, build_mac_wsLogic, getDefaultCommandExecutor),
};
