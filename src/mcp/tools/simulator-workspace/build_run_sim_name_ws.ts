import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import {
  log,
  getDefaultCommandExecutor,
  validateRequiredParam,
  createTextResponse,
  executeXcodeBuildCommand,
  CommandExecutor,
} from '../../../utils/index.js';
import { execSync } from 'child_process';

// Helper function for simulator build logic
async function _handleSimulatorBuildLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;
  log(
    'info',
    `Building ${paramsRecord.workspacePath || paramsRecord.projectPath} for iOS Simulator`,
  );

  try {
    const buildParams = {
      workspacePath: paramsRecord.workspacePath as string,
      projectPath: paramsRecord.projectPath as string,
      scheme: paramsRecord.scheme as string,
      configuration: paramsRecord.configuration as string,
      derivedDataPath: paramsRecord.derivedDataPath as string,
      extraArgs: paramsRecord.extraArgs as string[],
    };

    const buildResult = await executeXcodeBuildCommand(
      buildParams,
      {
        platform: XcodePlatform.iOSSimulator,
        simulatorName: paramsRecord.simulatorName as string,
        simulatorId: paramsRecord.simulatorId as string,
        useLatestOS: paramsRecord.useLatestOS as boolean,
        logPrefix: 'Build',
      },
      paramsRecord.preferXcodebuild as boolean,
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
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;

  // Validate required parameters
  const workspaceValidation = validateRequiredParam('workspacePath', paramsRecord.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', paramsRecord.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorNameValidation = validateRequiredParam(
    'simulatorName',
    paramsRecord.simulatorName,
  );
  if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

  // Provide defaults
  const processedParams = paramsRecord as Record<string, unknown> & {
    workspacePath: string;
    scheme: string;
    simulatorName: string;
    configuration: string;
    useLatestOS: boolean;
    preferXcodebuild: boolean;
  };
  processedParams.configuration = (paramsRecord.configuration as string) ?? 'Debug';
  processedParams.useLatestOS = (paramsRecord.useLatestOS as boolean) ?? true;
  processedParams.preferXcodebuild = (paramsRecord.preferXcodebuild as boolean) ?? false;

  log(
    'info',
    `Building and running ${processedParams.workspacePath || processedParams.projectPath} on iOS Simulator`,
  );

  try {
    // Step 1: Find simulator by name first
    let simulatorsData;
    if (executor) {
      // When using dependency injection (testing), get simulator data from mock
      const simulatorListResult = await executor(
        ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        'List Simulators',
      );
      if (!simulatorListResult.success) {
        return createTextResponse(`Failed to list simulators: ${simulatorListResult.error}`, true);
      }
      simulatorsData = JSON.parse(simulatorListResult.output);
    } else {
      // Production path - use execSync
      const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
      simulatorsData = JSON.parse(simulatorsOutput);
    }
    let foundSimulator = null;

    // Find the target simulator by name
    for (const runtime in simulatorsData.devices) {
      if (simulatorsData.devices[runtime]) {
        for (const device of simulatorsData.devices[runtime]) {
          if (device.name === processedParams.simulatorName) {
            foundSimulator = device;
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
    } else if (processedParams.projectPath) {
      command.push('-project', processedParams.projectPath as string);
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
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
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
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return build_run_sim_name_wsLogic(args, getDefaultCommandExecutor());
  },
};
