import { z } from 'zod';
import { log, getDefaultCommandExecutor, CommandExecutor } from '../../../utils/index.js';
import {
  validateRequiredParam,
  createTextResponse,
  executeXcodeBuildCommand,
} from '../../../utils/index.js';
import { execSync } from 'child_process';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';

// Type definition for execSync function
type ExecSyncFunction = (command: string, options?: Record<string, unknown>) => Buffer | string;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;
  log('info', `Starting iOS Simulator build for scheme ${paramsRecord.scheme} (internal)`);

  return executeXcodeBuildCommandFn(
    params as Record<string, unknown>,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: paramsRecord.simulatorName as string | undefined,
      simulatorId: paramsRecord.simulatorId as string | undefined,
      useLatestOS: paramsRecord.useLatestOS as boolean | undefined,
      logPrefix: 'iOS Simulator Build',
    },
    paramsRecord.preferXcodebuild as boolean,
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
  const paramsRecord = params as Record<string, unknown>;

  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', paramsRecord.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', paramsRecord.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorIdValidation = validateRequiredParam('simulatorId', paramsRecord.simulatorId);
  if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

  log('info', `Starting iOS Simulator build and run for scheme ${paramsRecord.scheme} (internal)`);

  try {
    // --- Build Step ---
    const buildResult = await _handleSimulatorBuildLogic(
      params,
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
    if (paramsRecord.workspacePath) {
      command.push('-workspace', paramsRecord.workspacePath as string);
    } else if (paramsRecord.projectPath) {
      command.push('-project', paramsRecord.projectPath as string);
    }

    // Add the scheme and configuration
    command.push('-scheme', paramsRecord.scheme as string);
    command.push('-configuration', (paramsRecord.configuration ?? 'Debug') as string);

    // Handle destination for simulator
    let destinationString = '';
    if (paramsRecord.simulatorId) {
      destinationString = `platform=iOS Simulator,id=${paramsRecord.simulatorId}`;
    } else if (paramsRecord.simulatorName) {
      destinationString = `platform=iOS Simulator,name=${paramsRecord.simulatorName}${(paramsRecord.useLatestOS ?? true) ? ',OS=latest' : ''}`;
    } else {
      return createTextResponse(
        'Either simulatorId or simulatorName must be provided for iOS simulator build',
        true,
      );
    }

    command.push('-destination', destinationString);

    // Add derived data path if provided
    if (paramsRecord.derivedDataPath) {
      command.push('-derivedDataPath', paramsRecord.derivedDataPath as string);
    }

    // Add extra args if provided
    if (
      paramsRecord.extraArgs &&
      Array.isArray(paramsRecord.extraArgs) &&
      paramsRecord.extraArgs.length > 0
    ) {
      command.push(...(paramsRecord.extraArgs as string[]));
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
    let simulatorUuid = paramsRecord.simulatorId as string;
    if (!simulatorUuid && paramsRecord.simulatorName) {
      try {
        log('info', `Finding simulator UUID for name: ${paramsRecord.simulatorName}`);
        const simulatorsOutput = execSyncFn(
          'xcrun simctl list devices available --json',
        ).toString();
        const simulatorsJson = JSON.parse(simulatorsOutput);
        let foundSimulator = null;

        // Find the simulator in the available devices list
        for (const runtime in simulatorsJson.devices) {
          const devices = simulatorsJson.devices[runtime];
          for (const device of devices) {
            if (device.name === paramsRecord.simulatorName && device.isAvailable) {
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
            `Build succeeded, but could not find an available simulator named '${paramsRecord.simulatorName}'. Use list_simulators({}) to check available devices.`,
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

    const target = paramsRecord.simulatorId
      ? `simulator UUID ${paramsRecord.simulatorId}`
      : `simulator name '${paramsRecord.simulatorName}'`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ iOS simulator build and run succeeded for scheme ${paramsRecord.scheme} targeting ${target}.
          
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
