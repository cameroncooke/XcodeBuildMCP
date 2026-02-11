/**
 * Project Discovery Plugin: Get macOS Bundle ID
 *
 * Extracts the bundle identifier from a macOS app bundle (.app).
 */

import * as z from 'zod';
import { log } from '../../../utils/logging/index.ts';
import type { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/command.ts';
import { getDefaultFileSystemExecutor, getDefaultCommandExecutor } from '../../../utils/command.ts';
import type { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

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
  appPath: z.string().describe('Path to the .app bundle'),
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
      ],
      nextStepParams: {
        launch_mac_app: { appPath },
        build_macos: { scheme: 'SCHEME_NAME' },
      },
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

export const schema = getMacBundleIdSchema.shape;

export const handler = createTypedTool(
  getMacBundleIdSchema,
  (params: GetMacBundleIdParams) =>
    get_mac_bundle_idLogic(params, getDefaultCommandExecutor(), getDefaultFileSystemExecutor()),
  getDefaultCommandExecutor,
);
