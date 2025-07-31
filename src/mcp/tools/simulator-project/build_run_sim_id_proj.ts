import { z } from 'zod';
import { log, getDefaultCommandExecutor, CommandExecutor } from '../../../utils/index.js';
import {
  validateRequiredParam,
  createTextResponse,
  executeXcodeBuildCommand,
} from '../../../utils/index.js';
import { ToolResponse, XcodePlatform, SharedBuildParams } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildRunSimIdProjSchema = z.object({
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
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file (optional)'),
  simulatorName: z.string().optional().describe('Name of the simulator (optional)'),
});

// Use z.infer for type safety
type BuildRunSimIdProjParams = z.infer<typeof buildRunSimIdProjSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildRunSimIdProjParams,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  // Create SharedBuildParams object with required configuration property
  const sharedBuildParams: SharedBuildParams = {
    workspacePath: params.workspacePath,
    projectPath: params.projectPath,
    scheme: params.scheme,
    configuration: params.configuration ?? 'Debug',
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  return executeXcodeBuildCommandFn(
    sharedBuildParams,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    params.preferXcodebuild as boolean,
    'build',
    executor,
  );
}

// Exported business logic function for building and running iOS Simulator apps.
export async function build_run_sim_id_projLogic(
  params: BuildRunSimIdProjParams,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
  if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

  log('info', `Starting iOS Simulator build and run for scheme ${params.scheme} (internal)`);

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
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration ?? 'Debug');

    // Handle destination for simulator
    let destinationString = '';
    if (params.simulatorId) {
      destinationString = `platform=iOS Simulator,id=${params.simulatorId}`;
    } else if (params.simulatorName) {
      destinationString = `platform=iOS Simulator,name=${params.simulatorName}${(params.useLatestOS ?? true) ? ',OS=latest' : ''}`;
    } else {
      return createTextResponse(
        'Either simulatorId or simulatorName must be provided for iOS simulator build',
        true,
      );
    }

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
    let simulatorUuid = params.simulatorId;
    if (!simulatorUuid && params.simulatorName) {
      try {
        log('info', `Finding simulator UUID for name: ${params.simulatorName}`);
        const simulatorsResult = await executor(
          ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
          'Find Simulator',
        );
        if (!simulatorsResult.success) {
          throw new Error(simulatorsResult.error ?? 'Command failed');
        }
        const simulatorsOutput = simulatorsResult.output;
        const simulatorsJson: unknown = JSON.parse(simulatorsOutput);
        let foundSimulator: { name: string; udid: string; isAvailable: boolean } | null = null;

        // Find the simulator in the available devices list
        if (simulatorsJson && typeof simulatorsJson === 'object' && 'devices' in simulatorsJson) {
          const devicesObj = simulatorsJson.devices;
          if (devicesObj && typeof devicesObj === 'object') {
            for (const runtime in devicesObj) {
              const devices = (devicesObj as Record<string, unknown>)[runtime];
              if (Array.isArray(devices)) {
                for (const device of devices) {
                  if (
                    device &&
                    typeof device === 'object' &&
                    'name' in device &&
                    'isAvailable' in device &&
                    'udid' in device
                  ) {
                    const deviceObj = device as {
                      name: unknown;
                      isAvailable: unknown;
                      udid: unknown;
                    };
                    if (
                      typeof deviceObj.name === 'string' &&
                      typeof deviceObj.isAvailable === 'boolean' &&
                      typeof deviceObj.udid === 'string' &&
                      deviceObj.name === params.simulatorName &&
                      deviceObj.isAvailable
                    ) {
                      foundSimulator = {
                        name: deviceObj.name,
                        udid: deviceObj.udid,
                        isAvailable: deviceObj.isAvailable,
                      };
                      break;
                    }
                  }
                }
                if (foundSimulator) break;
              }
            }
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
        throw new Error(simulatorStateResult.error ?? 'Command failed');
      }
      const simulatorStateOutput = simulatorStateResult.output;
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
        const bootResult = await executor(
          ['xcrun', 'simctl', 'boot', simulatorUuid],
          'Boot Simulator',
        );
        if (!bootResult.success) {
          throw new Error(bootResult.error ?? 'Failed to boot simulator');
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
        throw new Error(openResult.error ?? 'Failed to open Simulator app');
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
        throw new Error(installResult.error ?? 'Failed to install app');
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
          'Get Bundle ID with PlistBuddy',
        );
        if (!plistResult.success) {
          throw new Error(plistResult.error ?? 'PlistBuddy command failed');
        }
        bundleId = plistResult.output.trim();
      } catch (plistError) {
        // Fallback to defaults if PlistBuddy fails
        const errorMessage = plistError instanceof Error ? plistError.message : String(plistError);
        log('warning', `PlistBuddy failed, trying defaults: ${errorMessage}`);
        const defaultsResult = await executor(
          ['defaults', 'read', `${appBundlePath}/Info`, 'CFBundleIdentifier'],
          'Get Bundle ID with defaults',
        );
        if (!defaultsResult.success) {
          throw new Error(defaultsResult.error ?? 'defaults command failed');
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
        throw new Error(launchResult.error ?? 'Failed to launch app');
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

    const target = params.simulatorId
      ? `simulator UUID ${params.simulatorId}`
      : `simulator name '${params.simulatorName}'`;

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
  name: 'build_run_sim_id_proj',
  description:
    "Builds and runs an app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_run_sim_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: buildRunSimIdProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    buildRunSimIdProjSchema,
    build_run_sim_id_projLogic,
    getDefaultCommandExecutor,
  ),
};
