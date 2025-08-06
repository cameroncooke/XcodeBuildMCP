/**
 * Device Workspace Plugin: Build Device Workspace
 *
 * Builds an app from a workspace for a physical Apple device.
 * IMPORTANT: Requires workspacePath and scheme.
 */

import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject (not ZodRawShape) for full type safety
const buildDevWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to build'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
});

// Infer type from schema - guarantees type/schema alignment
type BuildDevWsParams = z.infer<typeof buildDevWsSchema>;

export async function build_dev_wsLogic(
  params: BuildDevWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Parameters are guaranteed valid by Zod schema validation in createTypedTool
  // No manual validation needed for required parameters
  return executeXcodeBuildCommand(
    {
      ...params,
      configuration: params.configuration ?? 'Debug', // Default config
    },
    {
      platform: XcodePlatform.iOS,
      logPrefix: 'iOS Device Build',
    },
    params.preferXcodebuild,
    'build',
    executor,
  );
}

export default {
  name: 'build_dev_ws',
  description:
    "Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. Example: build_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
  schema: buildDevWsSchema.shape, // MCP SDK expects ZodRawShape
  handler: createTypedTool(buildDevWsSchema, build_dev_wsLogic, getDefaultCommandExecutor), // Type-safe factory eliminates all casting
};
