/**
 * Simulator Build Plugin: Build Simulator (Unified)
 *
 * Builds an app from a project or workspace for a specific simulator by UUID or name.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 * Accepts mutually exclusive `simulatorId` or `simulatorName`.
 */

import { z } from 'zod';
import { log } from '../../../utils/logging/index.ts';
import { executeXcodeBuildCommand } from '../../../utils/build/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { simulatorCommonOptions, projectWorkspaceOptions } from './shared-schemas.ts';
import { logUseLatestOSWarning } from '../../../utils/simulator-validation.ts';
import { mapPlatformStringToEnum } from '../../../utils/platform-utils.ts';

// Unified schema: XOR between projectPath and workspacePath, and XOR between simulatorId and simulatorName
const baseSchemaObject = z.object({
  ...projectWorkspaceOptions,
  ...simulatorCommonOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildSimulatorSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  })
  .refine((val) => val.simulatorId !== undefined || val.simulatorName !== undefined, {
    message: 'Either simulatorId or simulatorName is required.',
  })
  .refine((val) => !(val.simulatorId !== undefined && val.simulatorName !== undefined), {
    message: 'simulatorId and simulatorName are mutually exclusive. Provide only one.',
  });

export type BuildSimulatorParams = z.infer<typeof buildSimulatorSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildSimulatorParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
  const projectType = params.projectPath ? 'project' : 'workspace';
  const filePath = params.projectPath ?? params.workspacePath;

  const platform = mapPlatformStringToEnum(params.platform);
  const platformName = params.platform ?? 'iOS Simulator';

  // Log warning if useLatestOS is provided with simulatorId
  logUseLatestOSWarning(params.simulatorId, params.useLatestOS);

  log(
    'info',
    `Starting ${platformName} build for scheme ${params.scheme} from ${projectType}: ${filePath}`,
  );

  // Ensure configuration has a default value for SharedBuildParams compatibility
  const sharedBuildParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
  };

  // executeXcodeBuildCommand handles both simulatorId and simulatorName
  return executeXcodeBuildCommand(
    sharedBuildParams,
    {
      platform: platform,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.simulatorId ? false : params.useLatestOS, // Ignore useLatestOS with ID
      logPrefix: `${platformName} Build`,
    },
    params.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

export async function build_simLogic(
  params: BuildSimulatorParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Provide defaults
  const processedParams: BuildSimulatorParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true, // May be ignored if simulatorId is provided
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  return _handleSimulatorBuildLogic(processedParams, executor);
}

// Public schema = all fields optional (session defaults can provide values)
// This allows agents to provide parameters explicitly OR rely on session defaults
const publicSchemaObject = baseSchemaObject;

export default {
  name: 'build_sim',
  description: 'Builds an app for a simulator.',
  schema: publicSchemaObject.shape, // MCP SDK compatibility (public inputs only)
  handler: createSessionAwareTool<BuildSimulatorParams>(
    // Type assertion required: Zod's .refine() changes the schema type signature,
    // but the validated output type is still BuildSimulatorParams
    buildSimulatorSchema as unknown as z.ZodType<BuildSimulatorParams>,
    build_simLogic,
    getDefaultCommandExecutor,
    [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  ),
};
