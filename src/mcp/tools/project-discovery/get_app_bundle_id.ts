/**
 * Project Discovery Plugin: Get App Bundle ID
 *
 * Extracts the bundle identifier from an app bundle (.app) for any Apple platform
 * (iOS, iPadOS, watchOS, tvOS, visionOS).
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { FileSystemExecutor, getDefaultFileSystemExecutor } from '../../../utils/command.js';

/**
 * Sync executor function type for dependency injection
 */
export type SyncExecutor = (command: string) => string;

/**
 * Default sync executor implementation using execSync
 */
const defaultSyncExecutor: SyncExecutor = (command: string): string => {
  return execSync(command).toString().trim();
};

/**
 * Business logic for extracting bundle ID from app.
 * Separated for testing and reusability.
 */
export async function get_app_bundle_idLogic(
  params: Record<string, unknown>,
  syncExecutor: SyncExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const appPathValidation = validateRequiredParam('appPath', params.appPath);
  if (!appPathValidation.isValid) {
    return appPathValidation.errorResponse!;
  }

  const validated = { appPath: params.appPath as string };

  if (!fileSystemExecutor.existsSync(validated.appPath)) {
    return {
      content: [
        {
          type: 'text',
          text: `File not found: '${validated.appPath}'. Please check the path and try again.`,
        },
      ],
      isError: true,
    };
  }

  log('info', `Starting bundle ID extraction for app: ${validated.appPath}`);

  try {
    let bundleId;

    try {
      bundleId = syncExecutor(`defaults read "${validated.appPath}/Info" CFBundleIdentifier`);
    } catch {
      try {
        bundleId = syncExecutor(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${validated.appPath}/Info.plist"`,
        );
      } catch (innerError) {
        throw new Error(
          `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
        );
      }
    }

    log('info', `Extracted app bundle ID: ${bundleId}`);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Bundle ID: ${bundleId}`,
        },
        {
          type: 'text',
          text: `Next Steps:
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${validated.appPath}" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "${bundleId}" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${validated.appPath}" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "${bundleId}" })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error extracting app bundle ID: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error extracting app bundle ID: ${errorMessage}`,
        },
        {
          type: 'text',
          text: `Make sure the path points to a valid app bundle (.app directory).`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'get_app_bundle_id',
  description:
    "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
  schema: {
    appPath: z
      .string()
      .describe(
        'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return get_app_bundle_idLogic(args, defaultSyncExecutor, getDefaultFileSystemExecutor());
  },
};
