/**
 * Launch Tools - Tools for launching macOS and iOS applications
 *
 * This module provides tools for launching applications on macOS and in iOS simulators.
 * It handles the platform-specific launch commands and provides appropriate validation
 * and error handling.
 *
 * Responsibilities:
 * - Launching macOS applications using the 'open' command
 * - Launching iOS applications in simulators using 'simctl launch'
 * - Validating application paths and bundle identifiers
 * - Supporting command-line arguments for launched applications
 */

import { z } from 'zod';
import { log } from '../../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateRequiredParam, validateFileExists } from '../../utils/validation.js';
import { ToolResponse } from '../../types/common.js';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

/**
 * Launches a macOS application using the 'open' command.
 * IMPORTANT: You MUST provide the appPath parameter.
 * Example: launch_macos_app({ appPath: '/path/to/your/app.app' })
 * Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.
 */
export function registerLaunchMacOSAppTool(server: McpServer): void {
  server.tool(
    'launch_mac_app',
    "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
    {
      appPath: z
        .string()
        .describe('Path to the macOS .app bundle to launch (full path to the .app directory)'),
      args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
    },
    async (params): Promise<ToolResponse> => {
      // Validate required parameters
      const appPathValidation = validateRequiredParam('appPath', params.appPath);
      if (!appPathValidation.isValid) {
        return appPathValidation.errorResponse!;
      }

      // Validate that the app file exists
      const fileExistsValidation = await validateFileExists(params.appPath);
      if (!fileExistsValidation.isValid) {
        return fileExistsValidation.errorResponse!;
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
        await execPromise(command);

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
  );
}

/**
 * Stops a running macOS application
 */
export function registerStopMacOSAppTool(server: McpServer): void {
  server.tool(
    'stop_mac_app',
    'Stops a running macOS application. Can stop by app name or process ID.',
    {
      appName: z
        .string()
        .optional()
        .describe('Name of the application to stop (e.g., "Calculator" or "MyApp")'),
      processId: z.number().optional().describe('Process ID (PID) of the application to stop'),
    },
    async (params): Promise<ToolResponse> => {
      if (!params.appName && !params.processId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Either appName or processId must be provided.',
            },
          ],
          isError: true,
        };
      }

      log('info', `Stopping macOS app: ${params.appName || `PID ${params.processId}`}`);

      try {
        let command: string;

        if (params.processId) {
          // Stop by process ID
          command = `kill ${params.processId}`;
        } else {
          // Stop by app name - try pkill first, then osascript as fallback
          command = `pkill -f "${params.appName}" || osascript -e 'tell application "${params.appName}" to quit'`;
        }

        await execPromise(command);

        return {
          content: [
            {
              type: 'text',
              text: `✅ macOS app stopped successfully: ${params.appName || `PID ${params.processId}`}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error stopping macOS app: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Stop macOS app operation failed: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
