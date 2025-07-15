/**
 * macOS Workspace Plugin: Launch macOS App
 *
 * Launches a macOS application using the 'open' command.
 * IMPORTANT: You MUST provide the appPath parameter.
 */

import { z } from 'zod';
import { promisify } from 'util';
import { exec } from 'child_process';
import { log } from '../../utils/index.js';
import { validateRequiredParam, validateFileExists } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';
import { FileSystemExecutor } from '../../utils/command.js';

const execPromise = promisify(exec);

// Executive function type for dependency injection
type ExecFunction = (command: string) => Promise<{ stdout: string; stderr: string }>;

export default {
  name: 'launch_mac_app',
  description:
    "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
  schema: {
    appPath: z
      .string()
      .describe('Path to the macOS .app bundle to launch (full path to the .app directory)'),
    args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
  },
  async handler(
    args: Record<string, unknown>,
    executor?: ExecFunction,
    fileSystem?: FileSystemExecutor,
  ): Promise<ToolResponse> {
    const params = args;
    // Validate required parameters
    const appPathValidation = validateRequiredParam('appPath', params.appPath);
    if (!appPathValidation.isValid) {
      return appPathValidation.errorResponse;
    }

    // Validate that the app file exists
    const fileExistsValidation = validateFileExists(params.appPath as string, fileSystem);
    if (!fileExistsValidation.isValid) {
      return fileExistsValidation.errorResponse;
    }

    log('info', `Starting launch macOS app request for ${params.appPath}`);

    try {
      // Construct the command
      let command = `open "${params.appPath}"`;

      // Add any additional arguments if provided
      if (params.args && params.args.length > 0) {
        command += ` --args ${params.args.join(' ')}`;
      }

      // Execute the command
      const execFunc = executor || execPromise;
      await execFunc(command);

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
  },
};
