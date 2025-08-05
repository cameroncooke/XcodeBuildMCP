/**
 * Primary implementation of get_sim_app_path_name_proj tool
 * Gets the app bundle path for a simulator by name using a project file
 */

import { z } from 'zod';
import { log, getDefaultCommandExecutor } from '../../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import { CommandExecutor } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

const XcodePlatform = {
  macOS: 'macOS',
  iOS: 'iOS',
  iOSSimulator: 'iOS Simulator',
  watchOS: 'watchOS',
  watchOSSimulator: 'watchOS Simulator',
  tvOS: 'tvOS',
  tvOSSimulator: 'tvOS Simulator',
  visionOS: 'visionOS',
  visionOSSimulator: 'visionOS Simulator',
};

function constructDestinationString(
  platform: string,
  simulatorName: string,
  simulatorId: string,
  useLatest: boolean = true,
  arch?: string,
): string {
  const isSimulatorPlatform = [
    XcodePlatform.iOSSimulator,
    XcodePlatform.watchOSSimulator,
    XcodePlatform.tvOSSimulator,
    XcodePlatform.visionOSSimulator,
  ].includes(platform);

  // If ID is provided for a simulator, it takes precedence and uniquely identifies it.
  if (isSimulatorPlatform && simulatorId) {
    return `platform=${platform},id=${simulatorId}`;
  }

  // If name is provided for a simulator
  if (isSimulatorPlatform && simulatorName) {
    return `platform=${platform},name=${simulatorName}${useLatest ? ',OS=latest' : ''}`;
  }

  // If it's a simulator platform but neither ID nor name is provided (should be prevented by callers now)
  if (isSimulatorPlatform && !simulatorId && !simulatorName) {
    log(
      'warning',
      `Constructing generic destination for ${platform} without name or ID. This might not be specific enough.`,
    );
    throw new Error(`Simulator name or ID is required for specific ${platform} operations`);
  }

  // Handle non-simulator platforms
  switch (platform) {
    case XcodePlatform.macOS:
      return arch ? `platform=macOS,arch=${arch}` : 'platform=macOS';
    case XcodePlatform.iOS:
      return 'generic/platform=iOS';
    case XcodePlatform.watchOS:
      return 'generic/platform=watchOS';
    case XcodePlatform.tvOS:
      return 'generic/platform=tvOS';
    case XcodePlatform.visionOS:
      return 'generic/platform=visionOS';
  }
  // Fallback just in case (shouldn't be reached with enum)
  log('error', `Reached unexpected point in constructDestinationString for platform: ${platform}`);
  return `platform=${platform}`;
}

// Define schema as ZodObject
const getSimAppPathNameProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z
    .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .describe('Target simulator platform (Required)'),
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('Whether to use the latest OS version for the named simulator'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  simulatorId: z.string().optional().describe('UUID of the simulator'),
  arch: z.string().optional().describe('Architecture'),
});

// Use z.infer for type safety
type GetSimAppPathNameProjParams = z.infer<typeof getSimAppPathNameProjSchema>;

/**
 * Exported business logic function for getting app path
 */
export async function get_sim_app_path_name_projLogic(
  params: GetSimAppPathNameProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Parameter validation
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const platformValidation = validateRequiredParam('platform', params.platform);
  if (!platformValidation.isValid) return platformValidation.errorResponse!;

  const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
  if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

  // Set defaults
  const projectPath = params.projectPath;
  const scheme = params.scheme;
  const platform = params.platform;
  const simulatorName = params.simulatorName;
  const configuration = params.configuration ?? 'Debug';
  const useLatestOS = params.useLatestOS ?? true;
  const workspacePath = params.workspacePath;
  const simulatorId = params.simulatorId;
  const arch = params.arch;

  log('info', `Getting app path for scheme ${scheme} on platform ${platform}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project
    if (workspacePath) {
      command.push('-workspace', workspacePath);
    } else if (projectPath) {
      command.push('-project', projectPath);
    }

    // Add the scheme and configuration
    command.push('-scheme', scheme);
    command.push('-configuration', configuration);

    // Handle destination based on platform
    const isSimulatorPlatform = [
      XcodePlatform.iOSSimulator,
      XcodePlatform.watchOSSimulator,
      XcodePlatform.tvOSSimulator,
      XcodePlatform.visionOSSimulator,
    ].includes(platform);

    let destinationString = '';

    if (isSimulatorPlatform) {
      if (simulatorId) {
        destinationString = `platform=${platform},id=${simulatorId}`;
      } else if (simulatorName) {
        destinationString = `platform=${platform},name=${simulatorName}${useLatestOS ? ',OS=latest' : ''}`;
      } else {
        return createTextResponse(
          `For ${platform} platform, either simulatorId or simulatorName must be provided`,
          true,
        );
      }
    } else if (platform === XcodePlatform.macOS) {
      destinationString = constructDestinationString(platform, '', '', false, arch);
    } else if (platform === XcodePlatform.iOS) {
      destinationString = 'generic/platform=iOS';
    } else if (platform === XcodePlatform.watchOS) {
      destinationString = 'generic/platform=watchOS';
    } else if (platform === XcodePlatform.tvOS) {
      destinationString = 'generic/platform=tvOS';
    } else if (platform === XcodePlatform.visionOS) {
      destinationString = 'generic/platform=visionOS';
    } else {
      return createTextResponse(`Unsupported platform: ${platform}`, true);
    }

    command.push('-destination', destinationString);

    // Execute the command directly
    const result = await executor(command, 'Get App Path', true, undefined);

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
    if (platform === XcodePlatform.macOS) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_macos_bundle_id({ appPath: "${appPath}" })
2. Launch the app: launch_macos_app({ appPath: "${appPath}" })`;
    } else if (isSimulatorPlatform) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${appPath}" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`;
    } else if (
      [
        XcodePlatform.iOS,
        XcodePlatform.watchOS,
        XcodePlatform.tvOS,
        XcodePlatform.visionOS,
      ].includes(platform)
    ) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${appPath}" })
3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })`;
    } else {
      // For other platforms
      nextStepsText = `Next Steps:
1. The app has been built for ${platform}
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
  name: 'get_sim_app_path_name_proj',
  description:
    "Gets the app bundle path for a simulator by name using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. Example: get_sim_app_path_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
  schema: getSimAppPathNameProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    getSimAppPathNameProjSchema,
    get_sim_app_path_name_projLogic,
    getDefaultCommandExecutor,
  ),
};
