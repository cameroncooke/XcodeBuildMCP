/**
 * Simulator Get App Path Plugin: Get Simulator App Path (Unified)
 *
 * Gets the app bundle path for a simulator by UUID or name using either a project or workspace file.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 * Accepts mutually exclusive `simulatorId` or `simulatorName`.
 */

import { z } from 'zod';
import { log } from '../../../utils/logging/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

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

// Define base schema
const baseGetSimulatorAppPathSchema = z.object({
  projectPath: z
    .string()
    .optional()
    .describe('Path to .xcodeproj file. Provide EITHER this OR workspacePath, not both'),
  workspacePath: z
    .string()
    .optional()
    .describe('Path to .xcworkspace file. Provide EITHER this OR projectPath, not both'),
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z
    .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .describe('Target simulator platform (Required)'),
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('Whether to use the latest OS version for the named simulator'),
  arch: z.string().optional().describe('Optional architecture'),
});

// Add XOR validation with preprocessing
const getSimulatorAppPathSchema = z.preprocess(
  nullifyEmptyStrings,
  baseGetSimulatorAppPathSchema
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
    }),
);

// Use z.infer for type safety
type GetSimulatorAppPathParams = z.infer<typeof getSimulatorAppPathSchema>;

/**
 * Exported business logic function for getting app path
 */
export async function get_sim_app_pathLogic(
  params: GetSimulatorAppPathParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Set defaults - Zod validation already ensures required params are present
  const projectPath = params.projectPath;
  const workspacePath = params.workspacePath;
  const scheme = params.scheme;
  const platform = params.platform;
  const simulatorId = params.simulatorId;
  const simulatorName = params.simulatorName;
  const configuration = params.configuration ?? 'Debug';
  const useLatestOS = params.useLatestOS ?? true;
  const arch = params.arch;

  // Log warning if useLatestOS is provided with simulatorId
  if (simulatorId && params.useLatestOS !== undefined) {
    log(
      'warning',
      `useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)`,
    );
  }

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
        destinationString = `platform=${platform},name=${simulatorName}${(simulatorId ? false : useLatestOS) ? ',OS=latest' : ''}`;
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
    const builtProductsDirMatch = buildSettingsOutput.match(/^\s*BUILT_PRODUCTS_DIR\s*=\s*(.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/^\s*FULL_PRODUCT_NAME\s*=\s*(.+)$/m);

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
1. Get bundle ID: get_mac_bundle_id({ appPath: "${appPath}" })
2. Launch the app: launch_mac_app({ appPath: "${appPath}" })`;
    } else if (isSimulatorPlatform) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Boot simulator: boot_sim({ simulatorId: "SIMULATOR_UUID" })
3. Install app: install_app_sim({ simulatorId: "SIMULATOR_UUID", appPath: "${appPath}" })
4. Launch app: launch_app_sim({ simulatorId: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`;
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

const publicSchemaObject = baseGetSimulatorAppPathSchema.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  simulatorId: true,
  simulatorName: true,
  configuration: true,
  useLatestOS: true,
  arch: true,
} as const);

export default {
  name: 'get_sim_app_path',
  description: 'Retrieves the built app path for an iOS simulator.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: baseGetSimulatorAppPathSchema,
  }),
  handler: createSessionAwareTool<GetSimulatorAppPathParams>({
    internalSchema: getSimulatorAppPathSchema as unknown as z.ZodType<GetSimulatorAppPathParams>,
    logicFunction: get_sim_app_pathLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { allOf: ['scheme'], message: 'scheme is required' },
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
    exclusivePairs: [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  }),
};
