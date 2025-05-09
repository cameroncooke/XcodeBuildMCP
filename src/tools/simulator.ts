/**
 * Simulator Tools - Functions for working with iOS simulators using xcrun simctl
 *
 * This module provides tools for interacting with iOS simulators through the xcrun simctl
 * command-line interface. It supports listing, booting, and interacting with simulators.
 *
 * Responsibilities:
 * - Listing available iOS simulators with their UUIDs and properties
 * - Booting simulators by UUID
 * - Opening the Simulator.app application
 * - Installing applications in simulators
 * - Launching applications in simulators by bundle ID
 * - Setting the appearance mode of simulators (dark/light)
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { log } from '../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeXcodeCommand } from '../utils/xcode.js';
import { validateRequiredParam, validateFileExists } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { createTextContent } from './common.js';
import { startLogCapture } from '../utils/log_capture.js';

/**
 * Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })
 */
export function registerBootSimulatorTool(server: McpServer): void {
  server.tool(
    'boot_sim',
    "Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
    {
      simulatorUuid: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators)'),
    },
    async (params): Promise<ToolResponse> => {
      const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simulatorUuidValidation.isValid) {
        return simulatorUuidValidation.errorResponse!;
      }

      log('info', `Starting xcrun simctl boot request for simulator ${params.simulatorUuid}`);

      try {
        const command = ['xcrun', 'simctl', 'boot', params.simulatorUuid];
        const result = await executeXcodeCommand(command, 'Boot Simulator');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Boot simulator operation failed: ${result.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Simulator booted successfully. Next steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Install an app: install_app_sim({ simulatorUuid: "${params.simulatorUuid}", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })
4. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID", captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error during boot simulator operation: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Boot simulator operation failed: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}

export function registerListSimulatorsTool(server: McpServer): void {
  server.tool(
    'list_sims',
    'Lists available iOS simulators with their UUIDs. ',
    {
      enabled: z.boolean(),
    },
    async (): Promise<ToolResponse> => {
      log('info', 'Starting xcrun simctl list devices request');

      try {
        const command = ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'];
        const result = await executeXcodeCommand(command, 'List Simulators');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list simulators: ${result.error}`,
              },
            ],
          };
        }

        try {
          const simulatorsData = JSON.parse(result.output);
          let responseText = 'Available iOS Simulators:\n\n';

          for (const runtime in simulatorsData.devices) {
            const devices = simulatorsData.devices[runtime];

            if (devices.length === 0) continue;

            responseText += `${runtime}:\n`;

            for (const device of devices) {
              if (device.isAvailable) {
                responseText += `- ${device.name} (${device.udid})${device.state === 'Booted' ? ' [Booted]' : ''}\n`;
              }
            }

            responseText += '\n';
          }

          responseText += 'Next Steps:\n';
          responseText += "1. Boot a simulator: boot_sim({ simulatorUuid: 'UUID_FROM_ABOVE' })\n";
          responseText += '2. Open the simulator UI: open_sim({ enabled: true })\n';
          responseText +=
            "3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })\n"; // Example using project variant
          responseText +=
            "4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })"; // Example using project variant

          return {
            content: [
              {
                type: 'text',
                text: responseText,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: result.output,
              },
            ],
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error listing simulators: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list simulators: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}

export function registerInstallAppInSimulatorTool(server: McpServer): void {
  server.tool(
    'install_app_sim',
    "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
    {
      simulatorUuid: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators)'),
      appPath: z
        .string()
        .describe('Path to the .app bundle to install (full path to the .app directory)'),
    },
    async (params): Promise<ToolResponse> => {
      const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simulatorUuidValidation.isValid) {
        return simulatorUuidValidation.errorResponse!;
      }

      const appPathValidation = validateRequiredParam('appPath', params.appPath);
      if (!appPathValidation.isValid) {
        return appPathValidation.errorResponse!;
      }

      const appPathExistsValidation = validateFileExists(params.appPath);
      if (!appPathExistsValidation.isValid) {
        return appPathExistsValidation.errorResponse!;
      }

      log('info', `Starting xcrun simctl install request for simulator ${params.simulatorUuid}`);

      try {
        const command = ['xcrun', 'simctl', 'install', params.simulatorUuid, params.appPath];
        const result = await executeXcodeCommand(command, 'Install App in Simulator');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Install app in simulator operation failed: ${result.error}`,
              },
            ],
          };
        }

        let bundleId = '';
        try {
          bundleId = execSync(`defaults read "${params.appPath}/Info" CFBundleIdentifier`)
            .toString()
            .trim();
        } catch (error) {
          log('warning', `Could not extract bundle ID from app: ${error}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `App installed successfully in simulator ${params.simulatorUuid}`,
            },
            {
              type: 'text',
              text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "${params.simulatorUuid}"${bundleId ? `, bundleId: "${bundleId}"` : ', bundleId: "YOUR_APP_BUNDLE_ID"'} })`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error during install app in simulator operation: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Install app in simulator operation failed: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}

export function registerLaunchAppInSimulatorTool(server: McpServer): void {
  server.tool(
    'launch_app_sim',
    "Launches an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' })",
    {
      simulatorUuid: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators)'),
      bundleId: z
        .string()
        .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
      args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
    },
    async (params): Promise<ToolResponse> => {
      const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simulatorUuidValidation.isValid) {
        return simulatorUuidValidation.errorResponse!;
      }

      const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
      if (!bundleIdValidation.isValid) {
        return bundleIdValidation.errorResponse!;
      }

      log('info', `Starting xcrun simctl launch request for simulator ${params.simulatorUuid}`);

      // Check if the app is installed in the simulator
      try {
        const getAppContainerCmd = [
          'xcrun',
          'simctl',
          'get_app_container',
          params.simulatorUuid,
          params.bundleId,
          'app',
        ];
        const getAppContainerResult = await executeXcodeCommand(
          getAppContainerCmd,
          'Check App Installed',
        );
        if (!getAppContainerResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: `App is not installed on the simulator. Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.`,
              },
            ],
            isError: true,
          };
        }
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `App is not installed on the simulator (check failed). Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.`,
            },
          ],
          isError: true,
        };
      }

      try {
        const command = ['xcrun', 'simctl', 'launch', params.simulatorUuid, params.bundleId];

        if (params.args && params.args.length > 0) {
          command.push(...params.args);
        }

        const result = await executeXcodeCommand(command, 'Launch App in Simulator');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Launch app in simulator operation failed: ${result.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `App launched successfully in simulator ${params.simulatorUuid}`,
            },
            {
              type: 'text',
              text: `Next Steps:
1. You can now interact with the app in the simulator.
2. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "${params.bundleId}" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "${params.bundleId}", captureConsole: true })
   - Option 3: Restart with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "${params.bundleId}" })

3. When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error during launch app in simulator operation: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Launch app in simulator operation failed: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}

export function registerLaunchAppWithLogsInSimulatorTool(server: McpServer): void {
  server.tool(
    'launch_app_logs_sim',
    'Launches an app in an iOS simulator and captures its logs.',
    {
      simulatorUuid: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators)'),
      bundleId: z
        .string()
        .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
      args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
    },
    async (params): Promise<ToolResponse> => {
      const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simulatorUuidValidation.isValid) {
        return simulatorUuidValidation.errorResponse!;
      }

      const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
      if (!bundleIdValidation.isValid) {
        return bundleIdValidation.errorResponse!;
      }

      log('info', `Starting app launch with logs for simulator ${params.simulatorUuid}`);

      // Start log capture session
      const { sessionId, error } = await startLogCapture({
        simulatorUuid: params.simulatorUuid,
        bundleId: params.bundleId,
        captureConsole: true,
      });
      if (error) {
        return {
          content: [createTextContent(`App was launched but log capture failed: ${error}`)],
          isError: true,
        };
      }

      return {
        content: [
          createTextContent(
            `App launched successfully in simulator ${params.simulatorUuid} with log capture enabled.\n\nLog capture session ID: ${sessionId}\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "${sessionId}" })' to stop capture and retrieve logs.`,
          ),
        ],
      };
    },
  );
}

export function registerOpenSimulatorTool(server: McpServer): void {
  server.tool(
    'open_sim',
    'Opens the iOS Simulator app.',
    {
      enabled: z.boolean(),
    },
    async (): Promise<ToolResponse> => {
      log('info', 'Starting open simulator request');

      try {
        const command = ['open', '-a', 'Simulator'];
        const result = await executeXcodeCommand(command, 'Open Simulator');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Open simulator operation failed: ${result.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Simulator app opened successfully`,
            },
            {
              type: 'text',
              text: `Next Steps:
1. Boot a simulator if needed: boot_sim({ simulatorUuid: 'UUID_FROM_LIST_SIMULATORS' })
2. Launch your app and interact with it
3. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error during open simulator operation: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Open simulator operation failed: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}

export function registerSetSimulatorAppearanceTool(server: McpServer): void {
  server.tool(
    'set_sim_appearance',
    'Sets the appearance mode (dark/light) of an iOS simulator.',
    {
      simulatorUuid: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators)'),
      mode: z
        .enum(['dark', 'light'])
        .describe('The appearance mode to set (either "dark" or "light")'),
    },
    async (params): Promise<ToolResponse> => {
      const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simulatorUuidValidation.isValid) {
        return simulatorUuidValidation.errorResponse!;
      }

      log('info', `Setting simulator ${params.simulatorUuid} appearance to ${params.mode} mode`);

      try {
        const command = ['xcrun', 'simctl', 'ui', params.simulatorUuid, 'appearance', params.mode];
        const result = await executeXcodeCommand(command, 'Set Simulator Appearance');

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to set simulator appearance: ${result.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully set simulator ${params.simulatorUuid} to ${params.mode} mode`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error setting simulator appearance: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to set simulator appearance: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}
