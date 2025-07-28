import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator',
};

type BuildSimIdWsParams = {
  workspacePath: string;
  scheme: string;
  simulatorId: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
};

export async function build_sim_id_wsLogic(
  params: BuildSimIdWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;
  // Validate required parameters
  const workspaceValidation = validateRequiredParam('workspacePath', paramsRecord.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', paramsRecord.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorIdValidation = validateRequiredParam('simulatorId', paramsRecord.simulatorId);
  if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

  // Provide defaults
  const processedParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  log(
    'info',
    `Building ${processedParams.workspacePath || processedParams.projectPath} for iOS Simulator`,
  );

  const buildResult = await executeXcodeBuildCommand(
    processedParams,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: processedParams.simulatorName,
      simulatorId: processedParams.simulatorId,
      useLatestOS: processedParams.useLatestOS,
      logPrefix: 'Build',
    },
    processedParams.preferXcodebuild,
    'build',
    executor,
  );

  return buildResult;
}

export default {
  name: 'build_sim_id_ws',
  description:
    "Builds an app from a workspace for a specific simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_sim_id_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorId: z
      .string()
      .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
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
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return build_sim_id_wsLogic(args as BuildSimIdWsParams, getDefaultCommandExecutor());
  },
};
