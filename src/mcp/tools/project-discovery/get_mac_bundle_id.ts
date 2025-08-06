/**
 * Project Discovery Plugin: Get macOS Bundle ID
 *
 * Extracts the bundle identifier from a macOS app bundle (.app).
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import {
  CommandExecutor,
  FileSystemExecutor,
  getDefaultFileSystemExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

/**
 * Sync wrapper for CommandExecutor to handle synchronous commands
 */
async function executeSyncCommand(command: string, executor: CommandExecutor): Promise<string> {
  const result = await executor(['/bin/sh', '-c', command], 'macOS Bundle ID Extraction');
  if (!result.success) {
    throw new Error(result.error ?? 'Command failed');
  }
  return result.output || '';
}

// Define schema as ZodObject
const getMacBundleIdSchema = z.object({
  appPath: z
    .string()
    .describe(
      'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
    ),
});

// Use z.infer for type safety
type GetMacBundleIdParams = z.infer<typeof getMacBundleIdSchema>;

/**
 * Business logic for extracting macOS bundle ID
 */
export async function get_mac_bundle_idLogic(
  params: GetMacBundleIdParams,
  executor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
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

  log('info', `Starting bundle ID extraction for macOS app: ${appPath}`);

  try {
    let bundleId;

    try {
      bundleId = await executeSyncCommand(
        `defaults read "${appPath}/Contents/Info" CFBundleIdentifier`,
        executor,
      );
    } catch {
      try {
        bundleId = await executeSyncCommand(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appPath}/Contents/Info.plist"`,
          executor,
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
- Launch the app: launch_mac_app({ appPath: "${appPath}" })
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
  schema: getMacBundleIdSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    getMacBundleIdSchema,
    (params: GetMacBundleIdParams) =>
      get_mac_bundle_idLogic(params, getDefaultCommandExecutor(), getDefaultFileSystemExecutor()),
    getDefaultCommandExecutor,
  ),
};
