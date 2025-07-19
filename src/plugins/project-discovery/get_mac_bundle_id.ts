/**
 * Project Discovery Plugin: Get macOS Bundle ID
 *
 * Extracts the bundle identifier from a macOS app bundle (.app).
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';
import { FileSystemExecutor, getDefaultFileSystemExecutor } from '../../utils/command.js';

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
 * Internal logic for extracting bundle ID from macOS app.
 */
async function _processExtraction(
  validated: { appPath: string },
  syncExecutor: SyncExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
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

  log('info', `Starting bundle ID extraction for macOS app: ${validated.appPath}`);

  try {
    let bundleId;

    try {
      bundleId = syncExecutor(
        `defaults read "${validated.appPath}/Contents/Info" CFBundleIdentifier`,
      );
    } catch {
      try {
        bundleId = syncExecutor(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${validated.appPath}/Contents/Info.plist"`,
        );
      } catch (innerError) {
        throw new Error(
          `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
        );
      }
    }

    log('info', `Extracted macOS bundle ID: ${bundleId}`);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Bundle ID: ${bundleId}`,
        },
        {
          type: 'text',
          text: `Next Steps:
- Launch the app: launch_mac_app({ appPath: "${validated.appPath}" })
- Build from workspace: macos_build_workspace({ workspacePath: "PATH_TO_WORKSPACE", scheme: "SCHEME_NAME" })
- Build from project: macos_build_project({ projectPath: "PATH_TO_PROJECT", scheme: "SCHEME_NAME" })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error extracting macOS bundle ID: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error extracting macOS bundle ID: ${errorMessage}`,
        },
        {
          type: 'text',
          text: `Make sure the path points to a valid macOS app bundle (.app directory).`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'get_mac_bundle_id',
  description:
    "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
  schema: z.object({
    appPath: z
      .string()
      .describe(
        'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  }),
  async handler(
    args: Record<string, unknown>,
    syncExecutor: SyncExecutor = defaultSyncExecutor,
    fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
  ): Promise<ToolResponse> {
    const params = args;

    const appPathValidation = validateRequiredParam('appPath', params.appPath);
    if (!appPathValidation.isValid) {
      return appPathValidation.errorResponse;
    }

    const validated = { appPath: params.appPath as string };
    return await _processExtraction(validated, syncExecutor, fileSystemExecutor);
  },
};
