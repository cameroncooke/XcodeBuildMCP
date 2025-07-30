import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';

type GetSimAppPathIdWsParams = {
  workspacePath: string;
  scheme?: string;
  platform?:
    | XcodePlatform.iOSSimulator
    | XcodePlatform.watchOSSimulator
    | XcodePlatform.tvOSSimulator
    | XcodePlatform.visionOSSimulator;
  simulatorId?: string;
  configuration?: string;
  useLatestOS?: boolean;
};

/**
 * Business logic for getting app path from simulator workspace
 */
export async function get_sim_app_path_id_wsLogic(
  params: GetSimAppPathIdWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Validate platform parameter
  if (!params.platform) {
    return createTextResponse(`Unsupported platform: ${params.platform}`, true);
  }

  log('info', `Getting app path for scheme ${params.scheme} on platform ${params.platform}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    }

    // Add the scheme and configuration
    if (params.scheme) {
      command.push('-scheme', params.scheme);
    }
    command.push('-configuration', params.configuration ?? 'Debug');

    // Handle destination based on platform
    const isSimulatorPlatform = [
      XcodePlatform.iOSSimulator,
      XcodePlatform.watchOSSimulator,
      XcodePlatform.tvOSSimulator,
      XcodePlatform.visionOSSimulator,
    ].includes(params.platform);

    let destinationString = '';

    if (isSimulatorPlatform) {
      if (params.simulatorId) {
        destinationString = `platform=${params.platform},id=${params.simulatorId}`;
      } else {
        return createTextResponse(
          `For ${params.platform} platform, either simulatorId or simulatorName must be provided`,
          true,
        );
      }
    } else {
      return createTextResponse(`Unsupported platform: ${params.platform}`, true);
    }

    command.push('-destination', destinationString);

    // Execute the command directly
    const result = await executor(command, 'Get App Path', false);

    if (!result.success) {
      return createTextResponse(`Failed to get app path: ${result.error}`, true);
    }

    if (!result.output) {
      return createTextResponse('Failed to extract build settings output from the result.', true);
    }

    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return createTextResponse(
        'Failed to extract app path from build settings. Make sure the app has been built first.',
        true,
      );
    }

    const builtProductsDir = builtProductsDirMatch[1].trim();
    const fullProductName = fullProductNameMatch[1].trim();
    const appPath = `${builtProductsDir}/${fullProductName}`;

    let nextStepsText = '';
    if (isSimulatorPlatform) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${appPath}" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`;
    } else {
      // For other platforms
      nextStepsText = `Next Steps:
1. The app has been built for ${params.platform}
2. Use platform-specific deployment tools to install and run the app`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ App path retrieved successfully: ${appPath}`,
        },
        {
          type: 'text',
          text: nextStepsText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error retrieving app path: ${errorMessage}`);
    return createTextResponse(`Error retrieving app path: ${errorMessage}`, true);
  }
}

export default {
  name: 'get_sim_app_path_id_ws',
  description:
    "Gets the app bundle path for a simulator by UUID using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    platform: z
      .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
      .describe('Target simulator platform (Required)'),
    simulatorId: z.string().describe('UUID of the simulator to use (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the simulator'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const workspaceValidation = validateRequiredParam('workspacePath', args.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

    const schemeValidation = validateRequiredParam('scheme', args.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

    const platformValidation = validateRequiredParam('platform', args.platform);
    if (!platformValidation.isValid) return platformValidation.errorResponse!;

    const simulatorIdValidation = validateRequiredParam('simulatorId', args.simulatorId);
    if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

    return get_sim_app_path_id_wsLogic(
      {
        workspacePath: args.workspacePath as string,
        scheme: args.scheme as string,
        platform: args.platform as
          | XcodePlatform.iOSSimulator
          | XcodePlatform.watchOSSimulator
          | XcodePlatform.tvOSSimulator
          | XcodePlatform.visionOSSimulator,
        simulatorId: args.simulatorId as string,
        configuration: (args.configuration as string) ?? 'Debug',
        useLatestOS: (args.useLatestOS as boolean) ?? true,
      },
      getDefaultCommandExecutor(),
    );
  },
};
