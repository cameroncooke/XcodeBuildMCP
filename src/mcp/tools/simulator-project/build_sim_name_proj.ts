import { z } from 'zod';
import {
  log,
  validateRequiredParam,
  executeXcodeBuildCommand,
  getDefaultCommandExecutor,
  CommandExecutor,
} from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator',
};

type BuildSimNameProjParams = {
  projectPath: string;
  scheme: string;
  simulatorName: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
  simulatorId?: string;
};

export async function build_sim_name_projLogic(
  params: BuildSimNameProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;
  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', paramsRecord.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', paramsRecord.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorNameValidation = validateRequiredParam(
    'simulatorName',
    paramsRecord.simulatorName,
  );
  if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

  // Provide defaults
  const finalParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true,
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  log('info', `Starting iOS Simulator build for scheme ${finalParams.scheme} (internal)`);

  return executeXcodeBuildCommand(
    finalParams,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: finalParams.simulatorName,
      simulatorId: finalParams.simulatorId,
      useLatestOS: finalParams.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    finalParams.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

export default {
  name: 'build_sim_name_proj',
  description:
    "Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z
      .string()
      .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
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
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_sim_name_projLogic(args as BuildSimNameProjParams, getDefaultCommandExecutor());
  },
};
