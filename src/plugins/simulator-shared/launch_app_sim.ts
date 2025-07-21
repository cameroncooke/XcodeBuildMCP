import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';

export async function launch_app_simLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simulatorUuidValidation.isValid) {
    return simulatorUuidValidation.errorResponse;
  }

  const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
  if (!bundleIdValidation.isValid) {
    return bundleIdValidation.errorResponse;
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
    const getAppContainerResult = await executor(
      getAppContainerCmd,
      'Check App Installed',
      true,
      undefined,
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

    const result = await executor(command, 'Launch App in Simulator', true, undefined);

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
}

export default {
  name: 'launch_app_sim',
  description:
    "Launches an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' })",
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
    bundleId: z
      .string()
      .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
    args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return launch_app_simLogic(args, getDefaultCommandExecutor());
  },
};
