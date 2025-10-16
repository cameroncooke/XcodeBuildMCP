/**
 * Simulator Build & Run Plugin: Build Run Simulator (Unified)
 *
 * Builds and runs an app from a project or workspace on a specific simulator by UUID or name.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 * Accepts mutually exclusive `simulatorId` or `simulatorName`.
 */

import { z } from 'zod';
import { ToolResponse, SharedBuildParams } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import { executeXcodeBuildCommand } from '../../../utils/build/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { determineSimulatorUuid } from '../../../utils/simulator-utils.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { simulatorCommonOptions, projectWorkspaceOptions } from './shared-schemas.ts';
import { logUseLatestOSWarning } from '../../../utils/simulator-validation.ts';
import { mapPlatformStringToEnum } from '../../../utils/platform-utils.ts';

// Unified schema: XOR between projectPath and workspacePath, and XOR between simulatorId and simulatorName
const baseSchemaObject = z.object({
  ...projectWorkspaceOptions,
  ...simulatorCommonOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildRunSimulatorSchema = baseSchema
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
  });

export type BuildRunSimulatorParams = z.infer<typeof buildRunSimulatorSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildRunSimulatorParams,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  const projectType = params.projectPath ? 'project' : 'workspace';
  const filePath = params.projectPath ?? params.workspacePath;

  const platform = mapPlatformStringToEnum(params.platform);
  const platformName = params.platform ?? 'iOS Simulator';

  // Log warning if useLatestOS is provided with simulatorId
  logUseLatestOSWarning(params.simulatorId, params.useLatestOS);

  log(
    'info',
    `Starting ${platformName} build for scheme ${params.scheme} from ${projectType}: ${filePath}`,
  );

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
      platform: platform,
      simulatorId: params.simulatorId,
      simulatorName: params.simulatorName,
      useLatestOS: params.simulatorId ? false : params.useLatestOS,
      logPrefix: `${platformName} Build`,
    },
    params.preferXcodebuild as boolean,
    'build',
    executor,
  );
}

// Exported business logic function for building and running Simulator apps.
export async function build_run_simLogic(
  params: BuildRunSimulatorParams,
  executor: CommandExecutor,
  executeXcodeBuildCommandFn: typeof executeXcodeBuildCommand = executeXcodeBuildCommand,
): Promise<ToolResponse> {
  const projectType = params.projectPath ? 'project' : 'workspace';
  const filePath = params.projectPath ?? params.workspacePath;
  const platformName = params.platform ?? 'iOS Simulator';

  log(
    'info',
    `Starting ${platformName} build and run for scheme ${params.scheme} from ${projectType}: ${filePath}`,
  );

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
    const platformForDestination = params.platform ?? 'iOS Simulator';
    let destinationString: string;
    if (params.simulatorId) {
      destinationString = `platform=${platformForDestination},id=${params.simulatorId}`;
    } else if (params.simulatorName) {
      destinationString = `platform=${platformForDestination},name=${params.simulatorName}${(params.useLatestOS ?? true) ? ',OS=latest' : ''}`;
    } else {
      // This shouldn't happen due to validation, but handle it
      destinationString = `platform=${platformForDestination}`;
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

    // Try both approaches to get app path - first the project approach (CODESIGNING_FOLDER_PATH)
    let appBundlePath: string | null = null;

    // Project approach: Extract CODESIGNING_FOLDER_PATH from build settings to get app path
    const appPathMatch = buildSettingsOutput.match(/CODESIGNING_FOLDER_PATH = (.+\.app)/);
    if (appPathMatch?.[1]) {
      appBundlePath = appPathMatch[1].trim();
    } else {
      // Workspace approach: Extract BUILT_PRODUCTS_DIR and FULL_PRODUCT_NAME
      const builtProductsDirMatch = buildSettingsOutput.match(
        /^\s*BUILT_PRODUCTS_DIR\s*=\s*(.+)$/m,
      );
      const fullProductNameMatch = buildSettingsOutput.match(/^\s*FULL_PRODUCT_NAME\s*=\s*(.+)$/m);

      if (builtProductsDirMatch && fullProductNameMatch) {
        const builtProductsDir = builtProductsDirMatch[1].trim();
        const fullProductName = fullProductNameMatch[1].trim();
        appBundlePath = `${builtProductsDir}/${fullProductName}`;
      }
    }

    if (!appBundlePath) {
      return createTextResponse(
        `Build succeeded, but could not find app path in build settings.`,
        true,
      );
    }

    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Find/Boot Simulator Step ---
    // Use our helper to determine the simulator UUID
    const uuidResult = await determineSimulatorUuid(
      { simulatorUuid: params.simulatorId, simulatorName: params.simulatorName },
      executor,
    );

    if (uuidResult.error) {
      return createTextResponse(`Build succeeded, but ${uuidResult.error.content[0].text}`, true);
    }

    if (uuidResult.warning) {
      log('warning', uuidResult.warning);
    }

    const simulatorUuid = uuidResult.uuid;

    if (!simulatorUuid) {
      return createTextResponse(
        'Build succeeded, but no simulator specified and failed to find a suitable one.',
        true,
      );
    }

    // Check simulator state and boot if needed
    try {
      log('info', `Checking simulator state for UUID: ${simulatorUuid}`);
      const simulatorListResult = await executor(
        ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        'List Simulators',
      );
      if (!simulatorListResult.success) {
        throw new Error(simulatorListResult.error ?? 'Failed to list simulators');
      }

      const simulatorsData = JSON.parse(simulatorListResult.output) as {
        devices: Record<string, unknown[]>;
      };
      let targetSimulator: { udid: string; name: string; state: string } | null = null;

      // Find the target simulator
      for (const runtime in simulatorsData.devices) {
        const devices = simulatorsData.devices[runtime];
        if (Array.isArray(devices)) {
          for (const device of devices) {
            if (
              typeof device === 'object' &&
              device !== null &&
              'udid' in device &&
              'name' in device &&
              'state' in device &&
              typeof device.udid === 'string' &&
              typeof device.name === 'string' &&
              typeof device.state === 'string' &&
              device.udid === simulatorUuid
            ) {
              targetSimulator = {
                udid: device.udid,
                name: device.name,
                state: device.state,
              };
              break;
            }
          }
          if (targetSimulator) break;
        }
      }

      if (!targetSimulator) {
        return createTextResponse(
          `Build succeeded, but could not find simulator with UUID: ${simulatorUuid}`,
          true,
        );
      }

      // Boot if needed
      if (targetSimulator.state !== 'Booted') {
        log('info', `Booting simulator ${targetSimulator.name}...`);
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

      // Try multiple methods to get bundle ID - first PlistBuddy, then plutil, then defaults
      let bundleIdResult = null;

      // Method 1: PlistBuddy (most reliable)
      try {
        bundleIdResult = await executor(
          [
            '/usr/libexec/PlistBuddy',
            '-c',
            'Print :CFBundleIdentifier',
            `${appBundlePath}/Info.plist`,
          ],
          'Get Bundle ID with PlistBuddy',
        );
        if (bundleIdResult.success) {
          bundleId = bundleIdResult.output.trim();
        }
      } catch {
        // Continue to next method
      }

      // Method 2: plutil (workspace approach)
      if (!bundleId) {
        try {
          bundleIdResult = await executor(
            ['plutil', '-extract', 'CFBundleIdentifier', 'raw', `${appBundlePath}/Info.plist`],
            'Get Bundle ID with plutil',
          );
          if (bundleIdResult?.success) {
            bundleId = bundleIdResult.output?.trim();
          }
        } catch {
          // Continue to next method
        }
      }

      // Method 3: defaults (fallback)
      if (!bundleId) {
        try {
          bundleIdResult = await executor(
            ['defaults', 'read', `${appBundlePath}/Info`, 'CFBundleIdentifier'],
            'Get Bundle ID with defaults',
          );
          if (bundleIdResult?.success) {
            bundleId = bundleIdResult.output?.trim();
          }
        } catch {
          // All methods failed
        }
      }

      if (!bundleId) {
        throw new Error('Could not extract bundle ID from Info.plist using any method');
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
    log('info', `✅ ${platformName} simulator build & run succeeded.`);

    const target = params.simulatorId
      ? `simulator UUID '${params.simulatorId}'`
      : `simulator name '${params.simulatorName}'`;
    const sourceType = params.projectPath ? 'project' : 'workspace';
    const sourcePath = params.projectPath ?? params.workspacePath;

    return {
      content: [
        {
          type: 'text',
          text: `✅ ${platformName} simulator build and run succeeded for scheme ${params.scheme} from ${sourceType} ${sourcePath} targeting ${target}.

The app (${bundleId}) is now running in the ${platformName}.
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
    const platformName = params.platform ?? 'iOS Simulator';
    log('error', `Error in ${platformName} build and run: ${errorMessage}`);
    return createTextResponse(`Error in ${platformName} build and run: ${errorMessage}`, true);
  }
}

// Public schema = all fields optional (session defaults can provide values)
// This allows agents to provide parameters explicitly OR rely on session defaults
const publicSchemaObject = baseSchemaObject;

export default {
  name: 'build_run_sim',
  description: 'Builds and runs an app on a simulator.',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<BuildRunSimulatorParams>(
    // Type assertion required: Zod's .refine() changes the schema type signature,
    // but the validated output type is still BuildRunSimulatorParams
    buildRunSimulatorSchema as unknown as z.ZodType<BuildRunSimulatorParams>,
    build_run_simLogic,
    getDefaultCommandExecutor,
    [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  ),
};
