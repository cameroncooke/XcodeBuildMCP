import { z } from 'zod';
import { log } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { execSync } from 'child_process';

const XcodePlatform = {
  iOSSimulator: 'iOS Simulator',
};

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: any,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
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
  );
}

// Internal logic for building and running iOS Simulator apps.
async function _handleIOSSimulatorBuildAndRunLogic(
  params: any,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  log('info', `Starting iOS Simulator build and run for scheme ${params.scheme} (internal)`);

  try {
    // --- Build Step ---
    const buildResult = await _handleSimulatorBuildLogic(params);

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
    command.push('-configuration', params.configuration);

    // Handle destination for simulator
    let destinationString = '';
    if (params.simulatorId) {
      destinationString = `platform=iOS Simulator,id=${params.simulatorId}`;
    } else if (params.simulatorName) {
      destinationString = `platform=iOS Simulator,name=${params.simulatorName}${params.useLatestOS ? ',OS=latest' : ''}`;
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
    const result = await executeCommand(command, 'Get App Path');

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
    let simulatorUuid = params.simulatorId;
    if (!simulatorUuid && params.simulatorName) {
      try {
        log('info', `Finding simulator UUID for name: ${params.simulatorName}`);
        const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
        const simulatorsJson = JSON.parse(simulatorsOutput);
        let foundSimulator = null;

        // Find the simulator in the available devices list
        for (const runtime in simulatorsJson.devices) {
          const devices = simulatorsJson.devices[runtime];
          for (const device of devices) {
            if (device.name === params.simulatorName && device.isAvailable) {
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
      const simulatorStateOutput = execSync('xcrun simctl list devices').toString();
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
        execSync(`xcrun simctl boot "${simulatorUuid}"`);
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
      execSync('open -a Simulator');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warning', `Warning: Could not open Simulator app: ${errorMessage}`);
      // Don't fail the whole operation for this
    }

    // --- Install App Step ---
    try {
      log('info', `Installing app at path: ${appBundlePath} to simulator: ${simulatorUuid}`);
      execSync(`xcrun simctl install "${simulatorUuid}" "${appBundlePath}"`);
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
        bundleId = execSync(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appBundlePath}/Info.plist"`,
        )
          .toString()
          .trim();
      } catch (plistError) {
        // Fallback to defaults if PlistBuddy fails
        const errorMessage = plistError instanceof Error ? plistError.message : String(plistError);
        log('warning', `PlistBuddy failed, trying defaults: ${errorMessage}`);
        bundleId = execSync(`defaults read "${appBundlePath}/Info" CFBundleIdentifier`)
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
      execSync(`xcrun simctl launch "${simulatorUuid}" "${bundleId}"`);
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
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    // Validate required parameters
    const projectValidation = validateRequiredParam('projectPath', params.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

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
