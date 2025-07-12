import { z } from 'zod';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator',
};

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(params: Record<string, unknown>): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
    {
      ...params,
    },
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    params.preferXcodebuild,
    'build',
  );
}

export default {
  name: 'build_sim_id_proj',
  description:
    "Builds an app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_sim_id_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
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
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const params = args;
    // Validate required parameters
    const projectValidation = validateRequiredParam('projectPath', params.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
    if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse;

    // Provide defaults
    return _handleSimulatorBuildLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
      preferXcodebuild: params.preferXcodebuild ?? false,
    });
  },
};
