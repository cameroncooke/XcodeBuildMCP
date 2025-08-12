import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const launchAppSimSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

// Extended params type that supports both UUID and name
interface LaunchAppSimExtendedParams {
  simulatorUuid?: string;
  simulatorName?: string;
  bundleId: string;
  args?: string[];
}

export async function launch_app_simLogic(
  params: LaunchAppSimExtendedParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  let simulatorUuid = params.simulatorUuid;
  let simulatorDisplayName = simulatorUuid ?? '';

  // If simulatorName is provided, look it up
  if (params.simulatorName && !simulatorUuid) {
    log('info', `Looking up simulator by name: ${params.simulatorName}`);

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
    const simulatorsData = JSON.parse(simulatorListResult.output) as {
      devices: Record<string, unknown[]>;
    };

    let foundSimulator: { udid: string; name: string } | null = null;

    // Find the target simulator by name
    for (const runtime in simulatorsData.devices) {
      const devices = simulatorsData.devices[runtime] as Array<{ udid: string; name: string }>;
      const simulator = devices.find((device) => device.name === params.simulatorName);
      if (simulator) {
        foundSimulator = simulator;
        break;
      }
    }

    if (!foundSimulator) {
      return {
        content: [
          {
            type: 'text',
            text: `Simulator named "${params.simulatorName}" not found. Use list_sims to see available simulators.`,
          },
        ],
        isError: true,
      };
    }

    simulatorUuid = foundSimulator.udid;
    simulatorDisplayName = `"${params.simulatorName}" (${foundSimulator.udid})`;
  }

  if (!simulatorUuid) {
    return {
      content: [
        {
          type: 'text',
          text: 'No simulator UUID or name provided',
        },
      ],
      isError: true,
    };
  }

  log('info', `Starting xcrun simctl launch request for simulator ${simulatorUuid}`);

  // Check if the app is installed in the simulator
  try {
    const getAppContainerCmd = [
      'xcrun',
      'simctl',
      'get_app_container',
      simulatorUuid,
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
    const command = ['xcrun', 'simctl', 'launch', simulatorUuid, params.bundleId];

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
          text: `✅ App launched successfully in simulator ${simulatorDisplayName || simulatorUuid}. If simulator window isn't visible, use: open_sim()

Next Steps:
1. To see the simulator window (if hidden): open_sim()
2. Log capture options:
   - Capture structured logs: start_sim_log_cap({ simulatorUuid: "${simulatorUuid}", bundleId: "${params.bundleId}" })
   - Capture console+structured logs: start_sim_log_cap({ simulatorUuid: "${simulatorUuid}", bundleId: "${params.bundleId}", captureConsole: true })
3. When done, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
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
    "Launches an app in an iOS simulator. If simulator window isn't visible, use open_sim() first. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' })",
  schema: launchAppSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(launchAppSimSchema, launch_app_simLogic, getDefaultCommandExecutor),
};
