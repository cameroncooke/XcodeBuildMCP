/**
 * Project Discovery Plugin: Get App Bundle ID
 *
 * Extracts the bundle identifier from an app bundle (.app) for any Apple platform
 * (iOS, iPadOS, watchOS, tvOS, visionOS).
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import {
  CommandExecutor,
  FileSystemExecutor,
  getDefaultFileSystemExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const getAppBundleIdSchema = z.object({
  appPath: z
    .string()
    .describe(
      'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
    ),
});

// Use z.infer for type safety
type GetAppBundleIdParams = z.infer<typeof getAppBundleIdSchema>;

/**
 * Sync wrapper for CommandExecutor to handle synchronous commands
 */
async function executeSyncCommand(command: string, executor: CommandExecutor): Promise<string> {
  const result = await executor(['/bin/sh', '-c', command], 'Bundle ID Extraction');
  if (!result.success) {
    throw new Error(result.error ?? 'Command failed');
  }
  return result.output || '';
}

/**
 * Business logic for extracting bundle ID from app.
 * Separated for testing and reusability.
 */
export async function get_app_bundle_idLogic(
  params: GetAppBundleIdParams,
  executor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const appPathValidation = validateRequiredParam('appPath', params.appPath);
  if (!appPathValidation.isValid) {
    return appPathValidation.errorResponse!;
  }

  const appPath = params.appPath;

  if (!fileSystemExecutor.existsSync(appPath)) {
    return {
      content: [
        {
          type: 'text',
          text: `File not found: '${appPath}'. Please check the path and try again.`,
        },
      ],
      isError: true,
    };
  }

  log('info', `Starting bundle ID extraction for app: ${appPath}`);

  try {
    let bundleId;

    try {
      bundleId = await executeSyncCommand(
        `defaults read "${appPath}/Info" CFBundleIdentifier`,
        executor,
      );
    } catch {
      try {
        bundleId = await executeSyncCommand(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appPath}/Info.plist"`,
          executor,
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
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${appPath}" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "${bundleId}" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${appPath}" })
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
  schema: getAppBundleIdSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    getAppBundleIdSchema,
    (params: GetAppBundleIdParams) =>
      get_app_bundle_idLogic(params, getDefaultCommandExecutor(), getDefaultFileSystemExecutor()),
    getDefaultCommandExecutor,
  ),
};
