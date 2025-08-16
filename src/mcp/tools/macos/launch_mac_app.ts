/**
 * macOS Workspace Plugin: Launch macOS App
 *
 * Launches a macOS application using the 'open' command.
 * IMPORTANT: You MUST provide the appPath parameter.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { validateFileExists } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const launchMacAppSchema = z.object({
  appPath: z
    .string()
    .describe('Path to the macOS .app bundle to launch (full path to the .app directory)'),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

// Use z.infer for type safety
type LaunchMacAppParams = z.infer<typeof launchMacAppSchema>;

export async function launch_mac_appLogic(
  params: LaunchMacAppParams,
  executor: CommandExecutor,
  fileSystem?: FileSystemExecutor,
): Promise<ToolResponse> {
  // Validate that the app file exists
  const fileExistsValidation = validateFileExists(params.appPath, fileSystem);
  if (!fileExistsValidation.isValid) {
    return fileExistsValidation.errorResponse!;
  }

  log('info', `Starting launch macOS app request for ${params.appPath}`);

  try {
    // Construct the command as string array for CommandExecutor
    const command = ['open', params.appPath];

    // Add any additional arguments if provided
    if (params.args && Array.isArray(params.args) && params.args.length > 0) {
      command.push('--args', ...params.args);
    }

    // Execute the command using CommandExecutor
    await executor(command, 'Launch macOS App');

    // Return success response
    return {
      content: [
        {
          type: 'text',
          text: `✅ macOS app launched successfully: ${params.appPath}`,
        },
      ],
    };
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during launch macOS app operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Launch macOS app operation failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'launch_mac_app',
  description:
    "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
  schema: launchMacAppSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(launchMacAppSchema, launch_mac_appLogic, getDefaultCommandExecutor),
};
