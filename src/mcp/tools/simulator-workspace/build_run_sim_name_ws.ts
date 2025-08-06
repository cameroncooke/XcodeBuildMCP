import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import {
  log,
  getDefaultCommandExecutor,
  createTextResponse,
  executeXcodeBuildCommand,
  CommandExecutor,
} from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildRunSimNameWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
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
});

// Use z.infer for type safety
type BuildRunSimNameWsParams = z.infer<typeof buildRunSimNameWsSchema>;

// Helper function for simulator build logic
async function _handleSimulatorBuildLogic(
  params: BuildRunSimNameWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Building ${params.workspacePath} for iOS Simulator`);

  try {
    // Ensure configuration has a default value for SharedBuildParams compatibility
    const sharedBuildParams = {
      ...params,
      configuration: params.configuration ?? 'Debug',
    };

    const buildResult = await executeXcodeBuildCommand(
      sharedBuildParams,
      {
        platform: XcodePlatform.iOSSimulator,
        simulatorName: params.simulatorName,
        useLatestOS: params.useLatestOS,
        logPrefix: 'Build',
      },
      params.preferXcodebuild,
      'build',
      executor,
    );

    return buildResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error building for iOS Simulator: ${errorMessage}`);
    return createTextResponse(`Error building for iOS Simulator: ${errorMessage}`, true);
  }
}

// Exported business logic function
export async function build_run_sim_name_wsLogic(
  params: BuildRunSimNameWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Provide defaults
  const processedParams = {
    workspacePath: params.workspacePath,
    scheme: params.scheme,
    simulatorName: params.simulatorName,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true,
    preferXcodebuild: params.preferXcodebuild ?? false,
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  log('info', `Building and running ${processedParams.workspacePath} on iOS Simulator`);

  try {
    // Step 1: Find simulator by name first
    const simulatorListResult = await executor(
      ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
      'List Simulators',
    );
    if (!simulatorListResult.success) {
      return createTextResponse(`Failed to list simulators: ${simulatorListResult.error}`, true);
    }
    const simulatorsData = JSON.parse(simulatorListResult.output) as {
      devices: Record<string, unknown[]>;
    };
    let foundSimulator: { udid: string; name: string; state: string } | null = null;

    // Find the target simulator by name
    for (const runtime in simulatorsData.devices) {
      const devices = simulatorsData.devices[runtime];
      if (Array.isArray(devices)) {
        for (const device of devices) {
          if (
            typeof device === 'object' &&
            device !== null &&
            'name' in device &&
            'udid' in device &&
            'state' in device &&
            typeof device.name === 'string' &&
            typeof device.udid === 'string' &&
            typeof device.state === 'string' &&
            device.name === processedParams.simulatorName
          ) {
            foundSimulator = {
              udid: device.udid,
              name: device.name,
              state: device.state,
            };
            break;
          }
        }
        if (foundSimulator) break;
      }
    }

    if (!foundSimulator) {
      return createTextResponse(
        `Build succeeded, but could not find an available simulator named '${processedParams.simulatorName}'. Use list_simulators({}) to check available devices.`,
        true,
      );
    }

    const simulatorUuid = foundSimulator.udid;
    log('info', `Found simulator for run: ${foundSimulator.name} (${simulatorUuid})`);

    // Step 2: Build
    const buildResult = await _handleSimulatorBuildLogic(processedParams, executor);

    if (buildResult.isError) {
      return buildResult;
    }

    // Step 3: Get App Path
    const command = ['xcodebuild', '-showBuildSettings'];

    if (processedParams.workspacePath) {
      command.push('-workspace', processedParams.workspacePath);
    }

    command.push('-scheme', processedParams.scheme);
    command.push('-configuration', processedParams.configuration);
    command.push(
      '-destination',
      `platform=${XcodePlatform.iOSSimulator},name=${processedParams.simulatorName}${processedParams.useLatestOS ? ',OS=latest' : ''}`,
    );

    const result = await executor(command, 'Get App Path', true, {});

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

    // Step 4: Boot if needed
    if (foundSimulator.state !== 'Booted') {
      log('info', `Booting simulator ${foundSimulator.name}...`);
      const bootResult = await executor(
        ['xcrun', 'simctl', 'boot', simulatorUuid],
        'Boot Simulator',
        true,
        {},
      );

      if (!bootResult.success) {
        return createTextResponse(`Failed to boot simulator: ${bootResult.error}`, true);
      }
    }

    // Step 5: Install App
    log('info', `Installing app at ${appPath}...`);
    const installResult = await executor(
      ['xcrun', 'simctl', 'install', simulatorUuid, appPath],
      'Install App',
      true,
      {},
    );

    if (!installResult.success) {
      return createTextResponse(`Failed to install app: ${installResult.error}`, true);
    }

    // Step 6: Launch App
    // Extract bundle ID from Info.plist
    const bundleIdResult = await executor(
      ['plutil', '-extract', 'CFBundleIdentifier', 'raw', `${appPath}/Info.plist`],
      'Get Bundle ID',
      true,
      {},
    );

    if (!bundleIdResult.success) {
      return createTextResponse(`Failed to get bundle ID: ${bundleIdResult.error}`, true);
    }

    const bundleId = bundleIdResult.output?.trim();
    if (!bundleId) {
      return createTextResponse('Failed to extract bundle ID from Info.plist', true);
    }

    log('info', `Launching app with bundle ID ${bundleId}...`);
    const launchResult = await executor(
      ['xcrun', 'simctl', 'launch', simulatorUuid, bundleId],
      'Launch App',
      true,
      {},
    );

    if (!launchResult.success) {
      return createTextResponse(`Failed to launch app: ${launchResult.error}`, true);
    }

    return {
      content: [
        ...(buildResult.content || []),
        {
          type: 'text',
          text: `✅ App built, installed, and launched successfully on ${foundSimulator.name}`,
        },
        {
          type: 'text',
          text: `📱 App Path: ${appPath}`,
        },
        {
          type: 'text',
          text: `📱 Bundle ID: ${bundleId}`,
        },
        {
          type: 'text',
          text: `📱 Simulator: ${foundSimulator.name} (${simulatorUuid})`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error building and running on iOS Simulator: ${errorMessage}`);
    return createTextResponse(`Error building and running on iOS Simulator: ${errorMessage}`, true);
  }
}

export default {
  name: 'build_run_sim_name_ws',
  description:
    "Builds and runs an app from a workspace on a simulator specified by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: build_run_sim_name_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: buildRunSimNameWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    buildRunSimNameWsSchema,
    build_run_sim_name_wsLogic,
    getDefaultCommandExecutor,
  ),
};
