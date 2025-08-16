/**
 * Device Shared Plugin: Build Device (Unified)
 *
 * Builds an app from a project or workspace for a physical Apple device.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { executeXcodeBuildCommand } from '../../../utils/build-utils.js';
import type { CommandExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to build'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildDeviceSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type BuildDeviceParams = z.infer<typeof buildDeviceSchema>;

/**
 * Business logic for building device project or workspace.
 * Exported for direct testing and reuse.
 */
export async function buildDeviceLogic(
  params: BuildDeviceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
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
  name: 'build_device',
  description:
    "Builds an app from a project or workspace for a physical Apple device. Provide exactly one of projectPath or workspacePath. Example: build_device({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape,
  handler: createTypedTool<BuildDeviceParams>(
    buildDeviceSchema as z.ZodType<BuildDeviceParams>,
    buildDeviceLogic,
    getDefaultCommandExecutor,
  ),
};
