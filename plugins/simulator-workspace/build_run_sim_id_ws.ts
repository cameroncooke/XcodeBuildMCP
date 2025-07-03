import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../src/utils/index.js';
import { executeXcodeBuildCommand } from '../../src/utils/index.js';
import { executeCommand } from '../../src/utils/index.js';
import { execSync } from 'child_process';

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

// Helper function for iOS Simulator build and run logic
async function _handleIOSSimulatorBuildAndRunLogic(params) {
  log('info', `Building and running ${params.workspacePath || params.projectPath} on iOS Simulator`);

  try {
    // Step 1: Build
    const buildResult = await _handleSimulatorBuildLogic(params);

    if (buildResult.isError) {
      return buildResult;
    }

    // Step 2: Get App Path
    const command = ['xcodebuild', '-showBuildSettings'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    command.push('-destination', `platform=${XcodePlatform.iOSSimulator},id=${params.simulatorId}`);

    const result = await executeCommand(command, 'Get App Path');

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

    // Step 3: Find/Boot Simulator
    const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
    const simulatorsData = JSON.parse(simulatorsOutput);
    let targetSimulator = null;
    
    // Find the target simulator
    for (const runtime in simulatorsData.devices) {
      if (simulatorsData.devices[runtime]) {
        for (const device of simulatorsData.devices[runtime]) {
          if (device.udid === params.simulatorId) {
            targetSimulator = device;
            break;
          }
        }
        if (targetSimulator) break;
      }
    }

    if (!targetSimulator) {
      return createTextResponse(`Simulator with ID ${params.simulatorId} not found.`, true);
    }

    // Boot if needed
    if (targetSimulator.state !== 'Booted') {
      log('info', `Booting simulator ${targetSimulator.name}...`);
      const bootResult = await executeCommand(
        ['xcrun', 'simctl', 'boot', params.simulatorId],
        'Boot Simulator',
      );

      if (!bootResult.success) {
        return createTextResponse(`Failed to boot simulator: ${bootResult.error}`, true);
      }
    }

    // Step 4: Install App
    log('info', `Installing app at ${appPath}...`);
    const installResult = await executeCommand(
      ['xcrun', 'simctl', 'install', params.simulatorId, appPath],
      'Install App',
    );

    if (!installResult.success) {
      return createTextResponse(`Failed to install app: ${installResult.error}`, true);
    }

    // Step 5: Launch App
    // Extract bundle ID from Info.plist
    const bundleIdResult = await executeCommand(
      ['plutil', '-extract', 'CFBundleIdentifier', 'raw', `${appPath}/Info.plist`],
      'Get Bundle ID',
    );

    if (!bundleIdResult.success) {
      return createTextResponse(`Failed to get bundle ID: ${bundleIdResult.error}`, true);
    }

    const bundleId = bundleIdResult.output?.trim();
    if (!bundleId) {
      return createTextResponse('Failed to extract bundle ID from Info.plist', true);
    }

    log('info', `Launching app with bundle ID ${bundleId}...`);
    const launchResult = await executeCommand(
      ['xcrun', 'simctl', 'launch', params.simulatorId, bundleId],
      'Launch App',
    );

    if (!launchResult.success) {
      return createTextResponse(`Failed to launch app: ${launchResult.error}`, true);
    }

    return {
      content: [
        ...(buildResult.content || []),
        {
          type: 'text',
          text: `✅ App built, installed, and launched successfully on ${targetSimulator.name}`,
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
          text: `📱 Simulator: ${targetSimulator.name} (${params.simulatorId})`,
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
  name: 'build_run_sim_id_ws',
  description: "Builds and runs an app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_run_sim_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorId: z.string().describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z.string().optional().describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z.boolean().optional().describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z.boolean().optional().describe('If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.'),
  },
  async handler(args: any) {
    const params = args;
    // Validate required parameters
    const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
    if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse;

    // Provide defaults
    return _handleIOSSimulatorBuildAndRunLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? true, // May be ignored
      preferXcodebuild: params.preferXcodebuild ?? false,
    });
  },
};