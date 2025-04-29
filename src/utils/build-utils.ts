/**
 * Build Utilities - Higher-level abstractions for Xcode build operations
 *
 * This utility module provides specialized functions for build-related operations
 * across different platforms (macOS, iOS, watchOS, etc.). It serves as a higher-level
 * abstraction layer on top of the core Xcode utilities.
 *
 * Responsibilities:
 * - Providing a unified interface (executeXcodeBuild) for all build operations
 * - Handling build-specific parameter formatting and validation
 * - Standardizing response formatting for build results
 * - Managing build-specific error handling and reporting
 * - Supporting various build actions (build, clean, showBuildSettings, etc.)
 *
 * This file depends on the lower-level utilities in xcode.ts for command execution
 * while adding build-specific behavior, formatting, and error handling.
 */

import { log } from './logger.js';
import { executeXcodeCommand, XcodePlatform, constructDestinationString } from './xcode.js';
import { ToolResponse, SharedBuildParams, PlatformBuildOptions } from '../types/common.js';
import { createTextResponse } from './validation.js';

/**
 * Common function to execute an Xcode build command across platforms
 * @param params Common build parameters
 * @param platformOptions Platform-specific options
 * @param buildAction The xcodebuild action to perform (e.g., 'build', 'clean', 'test')
 * @returns Promise resolving to tool response
 */
export async function executeXcodeBuild(
  params: SharedBuildParams,
  platformOptions: PlatformBuildOptions,
  buildAction: string = 'build',
): Promise<ToolResponse> {
  // Collect warnings, errors, and stderr messages from the build output
  const buildMessages: { type: 'text'; text: string }[] = [];
  function grepWarningsAndErrors(text: string): { type: 'warning' | 'error'; content: string }[] {
    return text
      .split('\n')
      .map((content) => {
        if (/warning:/i.test(content)) return { type: 'warning', content };
        if (/error:/i.test(content)) return { type: 'error', content };
        return null;
      })
      .filter(Boolean) as { type: 'warning' | 'error'; content: string }[];
  }

  log('info', `Starting ${platformOptions.logPrefix} ${buildAction} for scheme ${params.scheme}`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    command.push('-skipMacroValidation');

    // Construct destination string based on platform
    let destinationString: string;
    const isSimulatorPlatform = [
      XcodePlatform.iOSSimulator,
      XcodePlatform.watchOSSimulator,
      XcodePlatform.tvOSSimulator,
      XcodePlatform.visionOSSimulator,
    ].includes(platformOptions.platform);

    if (isSimulatorPlatform) {
      if (platformOptions.simulatorId) {
        destinationString = constructDestinationString(
          platformOptions.platform,
          undefined,
          platformOptions.simulatorId,
        );
      } else if (platformOptions.simulatorName) {
        destinationString = constructDestinationString(
          platformOptions.platform,
          platformOptions.simulatorName,
          undefined,
          platformOptions.useLatestOS,
        );
      } else {
        return createTextResponse(
          `For ${platformOptions.platform} platform, either simulatorId or simulatorName must be provided`,
          true,
        );
      }
    } else if (platformOptions.platform === XcodePlatform.macOS) {
      destinationString = constructDestinationString(
        platformOptions.platform,
        undefined,
        undefined,
        false,
        platformOptions.arch,
      );
    } else if (platformOptions.platform === XcodePlatform.iOS) {
      destinationString = 'generic/platform=iOS';
    } else if (platformOptions.platform === XcodePlatform.watchOS) {
      destinationString = 'generic/platform=watchOS';
    } else if (platformOptions.platform === XcodePlatform.tvOS) {
      destinationString = 'generic/platform=tvOS';
    } else if (platformOptions.platform === XcodePlatform.visionOS) {
      destinationString = 'generic/platform=visionOS';
    } else {
      return createTextResponse(`Unsupported platform: ${platformOptions.platform}`, true);
    }

    command.push('-destination', destinationString);

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push(buildAction);

    const result = await executeXcodeCommand(command, platformOptions.logPrefix);

    // Grep warnings and errors from stdout (build output)
    const warningOrErrorLines = grepWarningsAndErrors(result.output);
    warningOrErrorLines.forEach(({ type, content }) => {
      buildMessages.push({
        type: 'text',
        text: type === 'warning' ? `⚠️ Warning: ${content}` : `❌ Error: ${content}`,
      });
    });

    // Include all stderr lines as errors
    if (result.error) {
      result.error.split('\n').forEach((content) => {
        if (content.trim()) {
          buildMessages.push({ type: 'text', text: `❌ [stderr] ${content}` });
        }
      });
    }

    if (!result.success) {
      log('error', `${platformOptions.logPrefix} ${buildAction} failed: ${result.error}`);

      // Create concise error response with warnings/errors included
      const errorResponse = createTextResponse(
        `❌ ${platformOptions.logPrefix} ${buildAction} failed for scheme ${params.scheme}.`,
        true,
      );

      if (buildMessages.length > 0 && errorResponse.content) {
        errorResponse.content.unshift(...buildMessages);
      }

      return errorResponse;
    }

    log('info', `✅ ${platformOptions.logPrefix} ${buildAction} succeeded.`);

    // Create additional info based on platform and action
    let additionalInfo = '';

    // Only show next steps for 'build' action
    if (buildAction === 'build') {
      if (platformOptions.platform === XcodePlatform.macOS) {
        additionalInfo = `Next Steps:
1. Get App Path: get_macos_app_path_${params.workspacePath ? 'workspace' : 'project'}
2. Get Bundle ID: get_macos_bundle_id
3. Launch App: launch_macos_app`;
      } else if (platformOptions.platform === XcodePlatform.iOS) {
        additionalInfo = `Next Steps:
1. Get App Path: get_ios_device_app_path_${params.workspacePath ? 'workspace' : 'project'}
2. Get Bundle ID: get_ios_bundle_id`;
      } else if (isSimulatorPlatform) {
        const idOrName = platformOptions.simulatorId ? 'id' : 'name';
        const simIdParam = platformOptions.simulatorId ? 'simulatorId' : 'simulatorName';
        const simIdValue = platformOptions.simulatorId || platformOptions.simulatorName;

        additionalInfo = `Next Steps:
1. Get App Path: get_simulator_app_path_by_${idOrName}_${params.workspacePath ? 'workspace' : 'project'}({ ${simIdParam}: '${simIdValue}', scheme: '${params.scheme}' })
2. Get Bundle ID: get_ios_bundle_id({ appPath: 'APP_PATH_FROM_STEP_1' })
3. Choose one of the following options:
   - Option 1: Launch app normally:
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 2: Launch app with logs (captures both console and structured logs):
     launch_app_with_logs_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 3: Launch app normally, then capture structured logs only:
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
   - Option 4: Launch app normally, then capture all logs (will restart app):
     launch_app_in_simulator({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID' })
     start_simulator_log_capture({ simulatorUuid: 'SIMULATOR_UUID', bundleId: 'APP_BUNDLE_ID', captureConsole: true })

When done capturing logs, use: stop_and_get_simulator_log({ logSessionId: 'SESSION_ID' })`;
      }
    }

    const successResponse: ToolResponse = {
      content: [
        ...buildMessages,
        {
          type: 'text',
          text: `✅ ${platformOptions.logPrefix} ${buildAction} succeeded for scheme ${params.scheme}.`,
        },
      ],
      rawOutput: result.output + (result.error ? '\n' + result.error : ''),
    };

    // Only add additional info if we have any
    if (additionalInfo) {
      successResponse.content.push({
        type: 'text',
        text: additionalInfo,
      });
    }

    return successResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during ${platformOptions.logPrefix} ${buildAction}: ${errorMessage}`);
    return createTextResponse(
      `Error during ${platformOptions.logPrefix} ${buildAction}: ${errorMessage}`,
      true,
    );
  }
}
