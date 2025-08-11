/**
 * Unified implementation of get_simulator_app_path_name tool
 * Gets the app bundle path for a simulator by name using either a project or workspace file
 * Supports both .xcodeproj and .xcworkspace files with XOR validation
 */

import { z } from 'zod';
import { log, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTextResponse } from '../../../utils/index.js';
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

// Convert empty strings to undefined for proper XOR validation
function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}

// Define base schema
const baseGetSimulatorAppPathNameSchema = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
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
  simulatorId: z.string().optional().describe('Optional simulator UUID'),
  arch: z.string().optional().describe('Optional architecture'),
});

// Add XOR validation with preprocessing
const getSimulatorAppPathNameSchema = z.preprocess(
  nullifyEmptyStrings,
  baseGetSimulatorAppPathNameSchema
    .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
      message: 'Either projectPath or workspacePath is required.',
    })
    .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
      message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
    }),
);

// Use z.infer for type safety
type GetSimulatorAppPathNameParams = z.infer<typeof getSimulatorAppPathNameSchema>;

/**
 * Exported business logic function for getting app path
 */
export async function get_simulator_app_path_nameLogic(
  params: GetSimulatorAppPathNameParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Set defaults - Zod validation already ensures required params are present
  const projectPath = params.projectPath;
  const workspacePath = params.workspacePath;
  const scheme = params.scheme;
  const platform = params.platform;
  const simulatorName = params.simulatorName;
  const configuration = params.configuration ?? 'Debug';
  const useLatestOS = params.useLatestOS ?? true;
  const simulatorId = params.simulatorId;
  const arch = params.arch;

  log('info', `Getting app path for scheme ${scheme} on platform ${platform}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project (XOR validation ensures exactly one is provided)
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
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error retrieving app path: ${errorMessage}`);
    return createTextResponse(`Error retrieving app path: ${errorMessage}`, true);
  }
}

export default {
  name: 'get_simulator_app_path_name',
  description:
    "Gets the app bundle path for a simulator by name using either a project or workspace file. IMPORTANT: Requires either projectPath OR workspacePath (not both), plus scheme, platform, and simulatorName. Example: get_simulator_app_path_name({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
  schema: baseGetSimulatorAppPathNameSchema.shape, // MCP SDK compatibility
  handler: createTypedTool<GetSimulatorAppPathNameParams>(
    getSimulatorAppPathNameSchema as unknown as z.ZodType<GetSimulatorAppPathNameParams>,
    get_simulator_app_path_nameLogic,
    getDefaultCommandExecutor,
  ),
};
