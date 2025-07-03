import { z } from 'zod';
import { log } from '../../build/utils.js';
import { validateRequiredParam, createTextResponse } from '../../build/utils.js';
import { executeXcodeBuildCommand } from '../../build/utils.js';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator'
};

// Helper function for simulator build logic
async function _handleSimulatorBuildLogic(params) {
  log('info', `Building ${params.workspacePath || params.projectPath} for iOS Simulator`);

  try {
    const buildResult = await executeXcodeBuildCommand(
      params,
      {
        platform: XcodePlatform.iOSSimulator,
        simulatorName: params.simulatorName,
        simulatorId: params.simulatorId,
        useLatestOS: params.useLatestOS,
        logPrefix: 'Build',
      },
      params.preferXcodebuild,
      'build',
    );

    return buildResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error building for iOS Simulator: ${errorMessage}`);
    return createTextResponse(`Error building for iOS Simulator: ${errorMessage}`, true);
  }
}

export default {
  name: 'build_sim_name_ws',
  description: "Builds an app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: build_sim_name_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z.string().describe('Name of the simulator to use (e.g., \'iPhone 16\') (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z.string().optional().describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z.boolean().optional().describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z.boolean().optional().describe('If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.'),
  },
  async handler(params) {
    // Validate required parameters
    const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

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