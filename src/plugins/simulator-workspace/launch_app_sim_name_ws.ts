import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { executeCommand, CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';
import { execSync } from 'child_process';

export default {
  name: 'launch_app_sim_name_ws',
  description:
    "Launches an app in an iOS simulator by simulator name. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim_name_ws({ simulatorName: 'iPhone 16', bundleId: 'com.example.MyApp' })",
  schema: {
    simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16')"),
    bundleId: z
      .string()
      .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
    args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
  },
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<ToolResponse> {
    const params = args;
    const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
    if (!simulatorNameValidation.isValid) {
      return simulatorNameValidation.errorResponse;
    }

    const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
    if (!bundleIdValidation.isValid) {
      return bundleIdValidation.errorResponse;
    }

    log('info', `Starting xcrun simctl launch request for simulator named ${params.simulatorName}`);

    try {
      // Step 1: Find simulator by name first
      let simulatorsData;
      if (executor) {
        // When using dependency injection (testing), get simulator data from mock
        const simulatorListResult = await executor(
          ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
          'List Simulators',
          true,
        );
        if (!simulatorListResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list simulators: ${simulatorListResult.error}`,
              },
            ],
            isError: true,
          };
        }
        simulatorsData = JSON.parse(simulatorListResult.output);
      } else {
        // Production path - use execSync
        const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
        simulatorsData = JSON.parse(simulatorsOutput);
      }

      let foundSimulator = null;

      // Find the target simulator by name
      for (const runtime in simulatorsData.devices) {
        if (simulatorsData.devices[runtime]) {
          for (const device of simulatorsData.devices[runtime]) {
            if (device.name === params.simulatorName) {
              foundSimulator = device;
              break;
            }
          }
          if (foundSimulator) break;
        }
      }

      if (!foundSimulator) {
        return {
          content: [
            {
              type: 'text',
              text: `Could not find an available simulator named '${params.simulatorName}'. Use list_simulators({}) to check available devices.`,
            },
          ],
          isError: true,
        };
      }

      const simulatorUuid = foundSimulator.udid;
      log('info', `Found simulator for launch: ${foundSimulator.name} (${simulatorUuid})`);

      // Step 2: Check if the app is installed in the simulator
      const getAppContainerCmd = [
        'xcrun',
        'simctl',
        'get_app_container',
        simulatorUuid,
        params.bundleId,
        'app',
      ];
      const getAppContainerResult = await executeCommand(
        getAppContainerCmd,
        'Check App Installed',
        true,
        undefined,
        executor,
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

      // Step 3: Launch the app
      const command = ['xcrun', 'simctl', 'launch', simulatorUuid, params.bundleId];

      if (params.args && params.args.length > 0) {
        command.push(...params.args);
      }

      const result = await executeCommand(
        command,
        'Launch App in Simulator',
        true,
        undefined,
        executor,
      );

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
            text: `App launched successfully in simulator ${params.simulatorName} (${simulatorUuid})`,
          },
          {
            type: 'text',
            text: `Next Steps:
1. You can now interact with the app in the simulator.
2. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "${simulatorUuid}", bundleId: "${params.bundleId}" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "${simulatorUuid}", bundleId: "${params.bundleId}", captureConsole: true })
   - Option 3: Restart with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "${simulatorUuid}", bundleId: "${params.bundleId}" })

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
};
