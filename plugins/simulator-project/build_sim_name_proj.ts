import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { validateRequiredParam } from '../../src/utils/index.js';
import { executeXcodeBuildCommand } from '../../src/utils/index.js';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator'
};

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(params) {
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
  name: 'build_sim_name_proj',
  description: "Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z.string().describe('Name of the simulator to use (e.g., \'iPhone 16\') (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z.string().optional().describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z.boolean().optional().describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z.boolean().optional().describe('If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.'),
  },
  async handler(args: any) {
    const params = args;
    // Validate required parameters
    const projectValidation = validateRequiredParam('projectPath', params.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
    if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse;

    // Provide defaults
    return _handleSimulatorBuildLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? true,
      preferXcodebuild: params.preferXcodebuild ?? false,
    });
  },
};