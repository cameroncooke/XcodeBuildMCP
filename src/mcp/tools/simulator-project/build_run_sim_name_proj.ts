import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import { executeXcodeBuildCommand, XcodePlatform } from '../../../utils/index.js';
import { ToolResponse, SharedBuildParams } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildRunSimNameProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
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
type BuildRunSimNameProjParams = z.infer<typeof buildRunSimNameProjSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildRunSimNameProjParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  // Create SharedBuildParams object with required properties
  const sharedBuildParams: SharedBuildParams = {
    projectPath: params.projectPath,
    scheme: params.scheme,
    configuration: params.configuration ?? 'Debug',
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  return executeXcodeBuildCommand(
    sharedBuildParams,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    params.preferXcodebuild,
    'build',
    executor,
  );
}

// Main business logic for building and running iOS Simulator apps
export async function build_run_sim_name_projLogic(
  params: BuildRunSimNameProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
  if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

  // Provide defaults for the core logic
  const processedParams: BuildRunSimNameProjParams = {
    projectPath: params.projectPath,
    scheme: params.scheme,
    simulatorName: params.simulatorName,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true,
    preferXcodebuild: params.preferXcodebuild ?? false,
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  return _handleIOSSimulatorBuildAndRunLogic(processedParams, executor);
}

// Internal logic for building and running iOS Simulator apps.
async function _handleIOSSimulatorBuildAndRunLogic(
  params: BuildRunSimNameProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build and run for scheme ${params.scheme} (internal)`);

  try {
    // --- Build Step ---
    const buildResult = await _handleSimulatorBuildLogic(params, executor);

    if (buildResult.isError) {
      return buildResult; // Return the build error
    }

    // --- Get App Path Step ---
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the project
    command.push('-project', params.projectPath);

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration!);

    // Handle destination for simulator
    const destinationString = `platform=iOS Simulator,name=${params.simulatorName}${params.useLatestOS ? ',OS=latest' : ''}`;

    command.push('-destination', destinationString);

    // Add derived data path if provided
    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    // Add extra args if provided
    if (params.extraArgs && params.extraArgs.length > 0) {
      command.push(...params.extraArgs);
    }

    // Execute the command directly
    const result = await executor(command, 'Get App Path', true, undefined);

    // If there was an error with the command execution, return it
    if (!result.success) {
      return createTextResponse(
        `Build succeeded, but failed to get app path: ${result.error ?? 'Unknown error'}`,
        true,
      );
    }

    // Parse the output to extract the app path
    const buildSettingsOutput = result.output;

    // Extract CODESIGNING_FOLDER_PATH from build settings to get app path
    const appPathMatch = buildSettingsOutput.match(/CODESIGNING_FOLDER_PATH = (.+\.app)/);
    if (!appPathMatch?.[1]) {
      return createTextResponse(
        `Build succeeded, but could not find app path in build settings.`,
        true,
      );
    }

    const appBundlePath = appPathMatch[1].trim();
    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Find/Boot Simulator Step ---
    let simulatorUuid: string | undefined;
    try {
      log('info', `Finding simulator UUID for name: ${params.simulatorName}`);
      const simulatorsResult = await executor(
        ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        'Find Simulator',
      );
      if (!simulatorsResult.success) {
        return createTextResponse(
          `Build succeeded, but error finding simulator: ${simulatorsResult.error ?? 'Unknown error'}`,
          true,
        );
      }
      const simulatorsJson: unknown = JSON.parse(simulatorsResult.output);
      let foundSimulator: { udid: string; name: string } | null = null;

      // Find the simulator in the available devices list
      if (
        simulatorsJson &&
        typeof simulatorsJson === 'object' &&
        'devices' in simulatorsJson &&
        simulatorsJson.devices &&
        typeof simulatorsJson.devices === 'object'
      ) {
        const devices = simulatorsJson.devices as Record<string, unknown[]>;
        for (const runtime in devices) {
          const runtimeDevices = devices[runtime];
          if (Array.isArray(runtimeDevices)) {
            for (const device of runtimeDevices) {
              if (
                device &&
                typeof device === 'object' &&
                'name' in device &&
                'isAvailable' in device &&
                'udid' in device &&
                typeof device.name === 'string' &&
                typeof device.isAvailable === 'boolean' &&
                typeof device.udid === 'string' &&
                device.name === params.simulatorName &&
                device.isAvailable
              ) {
                foundSimulator = { udid: device.udid, name: device.name };
                break;
              }
            }
          }
          if (foundSimulator) break;
        }
      }

      if (foundSimulator) {
        simulatorUuid = foundSimulator.udid;
        log('info', `Found simulator for run: ${foundSimulator.name} (${simulatorUuid})`);
      } else {
        return createTextResponse(
          `Build succeeded, but could not find an available simulator named '${params.simulatorName}'. Use list_simulators({}) to check available devices.`,
          true,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(
        `Build succeeded, but error finding simulator: ${errorMessage}`,
        true,
      );
    }

    if (!simulatorUuid) {
      return createTextResponse(
        'Build succeeded, but no simulator specified and failed to find a suitable one.',
        true,
      );
    }

    // Ensure simulator is booted
    try {
      log('info', `Checking simulator state for UUID: ${simulatorUuid}`);
      const simulatorStateResult = await executor(
        ['xcrun', 'simctl', 'list', 'devices'],
        'Check Simulator State',
      );
      if (!simulatorStateResult.success) {
        return createTextResponse(
          `Build succeeded, but error checking simulator state: ${simulatorStateResult.error ?? 'Unknown error'}`,
          true,
        );
      }

      const simulatorLine = simulatorStateResult.output
        .split('\n')
        .find((line) => line.includes(simulatorUuid as string));

      const isBooted = simulatorLine ? simulatorLine.includes('(Booted)') : false;

      if (!simulatorLine) {
        return createTextResponse(
          `Build succeeded, but could not find simulator with UUID: ${simulatorUuid}`,
          true,
        );
      }

      if (!isBooted) {
        log('info', `Booting simulator ${simulatorUuid}`);
        const bootResult = await executor(
          ['xcrun', 'simctl', 'boot', simulatorUuid],
          'Boot Simulator',
        );
        if (!bootResult.success) {
          return createTextResponse(
            `Build succeeded, but error booting simulator: ${bootResult.error ?? 'Unknown error'}`,
            true,
          );
        }
      } else {
        log('info', `Simulator ${simulatorUuid} is already booted`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error checking/booting simulator: ${errorMessage}`);
      return createTextResponse(
        `Build succeeded, but error checking/booting simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Open Simulator UI Step ---
    try {
      log('info', 'Opening Simulator app');
      const openResult = await executor(['open', '-a', 'Simulator'], 'Open Simulator App');
      if (!openResult.success) {
        log(
          'warning',
          `Warning: Could not open Simulator app: ${openResult.error ?? 'Unknown error'}`,
        );
        // Don't fail the whole operation for this
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warning', `Warning: Could not open Simulator app: ${errorMessage}`);
      // Don't fail the whole operation for this
    }

    // --- Install App Step ---
    try {
      log('info', `Installing app at path: ${appBundlePath} to simulator: ${simulatorUuid}`);
      const installResult = await executor(
        ['xcrun', 'simctl', 'install', simulatorUuid, appBundlePath],
        'Install App',
      );
      if (!installResult.success) {
        return createTextResponse(
          `Build succeeded, but error installing app on simulator: ${installResult.error ?? 'Unknown error'}`,
          true,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error installing app: ${errorMessage}`);
      return createTextResponse(
        `Build succeeded, but error installing app on simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Get Bundle ID Step ---
    let bundleId;
    try {
      log('info', `Extracting bundle ID from app: ${appBundlePath}`);

      // Try PlistBuddy first (more reliable)
      try {
        const plistResult = await executor(
          [
            '/usr/libexec/PlistBuddy',
            '-c',
            'Print :CFBundleIdentifier',
            `${appBundlePath}/Info.plist`,
          ],
          'Extract Bundle ID with PlistBuddy',
          true,
        );

        if (plistResult.success && plistResult.output.trim()) {
          bundleId = plistResult.output.trim();
        } else {
          throw new Error('PlistBuddy failed or returned empty result');
        }
      } catch (plistError) {
        // Fallback to defaults if PlistBuddy fails
        const errorMessage = plistError instanceof Error ? plistError.message : String(plistError);
        log('warning', `PlistBuddy failed, trying defaults: ${errorMessage}`);

        const defaultsResult = await executor(
          ['defaults', 'read', `${appBundlePath}/Info`, 'CFBundleIdentifier'],
          'Extract Bundle ID with defaults',
          true,
        );

        if (!defaultsResult.success || !defaultsResult.output.trim()) {
          throw new Error('Both PlistBuddy and defaults failed to extract bundle ID');
        }

        bundleId = defaultsResult.output.trim();
      }

      if (!bundleId) {
        throw new Error('Could not extract bundle ID from Info.plist');
      }

      log('info', `Bundle ID for run: ${bundleId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error getting bundle ID: ${errorMessage}`);
      return createTextResponse(
        `Build and install succeeded, but error getting bundle ID: ${errorMessage}`,
        true,
      );
    }

    // --- Launch App Step ---
    try {
      log('info', `Launching app with bundle ID: ${bundleId} on simulator: ${simulatorUuid}`);
      const launchResult = await executor(
        ['xcrun', 'simctl', 'launch', simulatorUuid, bundleId],
        'Launch App',
      );
      if (!launchResult.success) {
        return createTextResponse(
          `Build and install succeeded, but error launching app on simulator: ${launchResult.error ?? 'Unknown error'}`,
          true,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error launching app: ${errorMessage}`);
      return createTextResponse(
        `Build and install succeeded, but error launching app on simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Success ---
    log('info', '✅ iOS simulator build & run succeeded.');

    const target = `simulator name '${params.simulatorName}'`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ iOS simulator build and run succeeded for scheme ${params.scheme} targeting ${target}.
          
The app (${bundleId}) is now running in the iOS Simulator. 
If you don't see the simulator window, it may be hidden behind other windows. The Simulator app should be open.

Next Steps:
- Option 1: Capture structured logs only (app continues running):
  start_simulator_log_capture({ simulatorUuid: '${simulatorUuid}', bundleId: '${bundleId}' })
- Option 2: Capture both console and structured logs (app will restart):
  start_simulator_log_capture({ simulatorUuid: '${simulatorUuid}', bundleId: '${bundleId}', captureConsole: true })
- Option 3: Launch app with logs in one step (for a fresh start):
  launch_app_with_logs_in_simulator({ simulatorUuid: '${simulatorUuid}', bundleId: '${bundleId}' })

When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in iOS Simulator build and run: ${errorMessage}`);
    return createTextResponse(`Error in iOS Simulator build and run: ${errorMessage}`, true);
  }
}

export default {
  name: 'build_run_sim_name_proj',
  description:
    "Builds and runs an app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_run_sim_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: buildRunSimNameProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    buildRunSimNameProjSchema,
    build_run_sim_name_projLogic,
    getDefaultCommandExecutor,
  ),
};
