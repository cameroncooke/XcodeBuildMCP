import { z } from 'zod';
import { log, getDefaultCommandExecutor, CommandExecutor } from '../../../utils/index.js';
import {
  validateRequiredParam,
  createTextResponse,
  executeXcodeBuildCommand,
} from '../../../utils/index.js';
import { execSync } from 'child_process';
import { ToolResponse } from '../../../types/common.js';

// Type definition for execSync function
type ExecSyncFunction = (command: string, options?: Record<string, unknown>) => Buffer | string;

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator',
};

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommandFn(
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
    executor,
  );
}

// Exported business logic function for building and running iOS Simulator apps.
export async function build_run_sim_id_projLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
  execSyncFn: ExecSyncFunction = execSync,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse;

  const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
  if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse;

  // Provide defaults
  const processedParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true, // May be ignored
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  log(
    'info',
    `Starting iOS Simulator build and run for scheme ${processedParams.scheme} (internal)`,
  );

  try {
    // --- Build Step ---
    const buildResult = await _handleSimulatorBuildLogic(
      processedParams,
      executor,
      executeXcodeBuildCommandFn,
    );

    if (buildResult.isError) {
      return buildResult; // Return the build error
    }

    // --- Get App Path Step ---
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project
    if (processedParams.workspacePath) {
      command.push('-workspace', processedParams.workspacePath);
    } else if (processedParams.projectPath) {
      command.push('-project', processedParams.projectPath);
    }

    // Add the scheme and configuration
    command.push('-scheme', processedParams.scheme);
    command.push('-configuration', processedParams.configuration);

    // Handle destination for simulator
    let destinationString = '';
    if (processedParams.simulatorId) {
      destinationString = `platform=iOS Simulator,id=${processedParams.simulatorId}`;
    } else if (processedParams.simulatorName) {
      destinationString = `platform=iOS Simulator,name=${processedParams.simulatorName}${processedParams.useLatestOS ? ',OS=latest' : ''}`;
    } else {
      return createTextResponse(
        'Either simulatorId or simulatorName must be provided for iOS simulator build',
        true,
      );
    }

    command.push('-destination', destinationString);

    // Add derived data path if provided
    if (processedParams.derivedDataPath) {
      command.push('-derivedDataPath', processedParams.derivedDataPath);
    }

    // Add extra args if provided
    if (processedParams.extraArgs && processedParams.extraArgs.length > 0) {
      command.push(...processedParams.extraArgs);
    }

    // Execute the command directly
    const result = await executor(command, 'Get App Path', true, undefined);

    // If there was an error with the command execution, return it
    if (!result.success) {
      return createTextResponse(
        `Build succeeded, but failed to get app path: ${result.error || 'Unknown error'}`,
        true,
      );
    }

    // Parse the output to extract the app path
    const buildSettingsOutput = result.output;

    // Extract CODESIGNING_FOLDER_PATH from build settings to get app path
    const appPathMatch = buildSettingsOutput.match(/CODESIGNING_FOLDER_PATH = (.+\.app)/);
    if (!appPathMatch || !appPathMatch[1]) {
      return createTextResponse(
        `Build succeeded, but could not find app path in build settings.`,
        true,
      );
    }

    const appBundlePath = appPathMatch[1].trim();
    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Find/Boot Simulator Step ---
    let simulatorUuid = processedParams.simulatorId;
    if (!simulatorUuid && processedParams.simulatorName) {
      try {
        log('info', `Finding simulator UUID for name: ${processedParams.simulatorName}`);
        const simulatorsOutput = execSyncFn(
          'xcrun simctl list devices available --json',
        ).toString();
        const simulatorsJson = JSON.parse(simulatorsOutput);
        let foundSimulator = null;

        // Find the simulator in the available devices list
        for (const runtime in simulatorsJson.devices) {
          const devices = simulatorsJson.devices[runtime];
          for (const device of devices) {
            if (device.name === processedParams.simulatorName && device.isAvailable) {
              foundSimulator = device;
              break;
            }
          }
          if (foundSimulator) break;
        }

        if (foundSimulator) {
          simulatorUuid = foundSimulator.udid;
          log('info', `Found simulator for run: ${foundSimulator.name} (${simulatorUuid})`);
        } else {
          return createTextResponse(
            `Build succeeded, but could not find an available simulator named '${processedParams.simulatorName}'. Use list_simulators({}) to check available devices.`,
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
      const simulatorStateOutput = execSyncFn('xcrun simctl list devices').toString();
      const simulatorLine = simulatorStateOutput
        .split('\n')
        .find((line) => line.includes(simulatorUuid));

      const isBooted = simulatorLine ? simulatorLine.includes('(Booted)') : false;

      if (!simulatorLine) {
        return createTextResponse(
          `Build succeeded, but could not find simulator with UUID: ${simulatorUuid}`,
          true,
        );
      }

      if (!isBooted) {
        log('info', `Booting simulator ${simulatorUuid}`);
        execSyncFn(`xcrun simctl boot "${simulatorUuid}"`);
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
      execSyncFn('open -a Simulator');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warning', `Warning: Could not open Simulator app: ${errorMessage}`);
      // Don't fail the whole operation for this
    }

    // --- Install App Step ---
    try {
      log('info', `Installing app at path: ${appBundlePath} to simulator: ${simulatorUuid}`);
      execSyncFn(`xcrun simctl install "${simulatorUuid}" "${appBundlePath}"`);
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
        bundleId = execSyncFn(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appBundlePath}/Info.plist"`,
        )
          .toString()
          .trim();
      } catch (plistError) {
        // Fallback to defaults if PlistBuddy fails
        const errorMessage = plistError instanceof Error ? plistError.message : String(plistError);
        log('warning', `PlistBuddy failed, trying defaults: ${errorMessage}`);
        bundleId = execSyncFn(`defaults read "${appBundlePath}/Info" CFBundleIdentifier`)
          .toString()
          .trim();
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
      execSyncFn(`xcrun simctl launch "${simulatorUuid}" "${bundleId}"`);
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

    const target = processedParams.simulatorId
      ? `simulator UUID ${processedParams.simulatorId}`
      : `simulator name '${processedParams.simulatorName}'`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ iOS simulator build and run succeeded for scheme ${processedParams.scheme} targeting ${target}.
          
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
  name: 'build_run_sim_id_proj',
  description:
    "Builds and runs an app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_run_sim_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorId: z
      .string()
      .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
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
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_run_sim_id_projLogic(args, getDefaultCommandExecutor());
  },
};
