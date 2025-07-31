/**
 * Device Project Plugin: Build Device Project
 *
 * Builds an app from a project file for a physical Apple device.
 * IMPORTANT: Requires projectPath and scheme.
 */

import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildDevProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file'),
  scheme: z.string().describe('The scheme to build'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
});

// Use z.infer for type safety
type BuildDevProjParams = z.infer<typeof buildDevProjSchema>;

/**
 * Business logic for building device project
 */
export async function build_dev_projLogic(
  params: BuildDevProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const processedParams = {
    ...params,
    configuration: params.configuration ?? 'Debug', // Default config
  };

  return executeXcodeBuildCommand(
    processedParams,
    {
      platform: XcodePlatform.iOS,
      logPrefix: 'iOS Device Build',
    },
    params.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

export default {
  name: 'build_dev_proj',
  description:
    "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: buildDevProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(buildDevProjSchema, build_dev_projLogic, getDefaultCommandExecutor),
};
