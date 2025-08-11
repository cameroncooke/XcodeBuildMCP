import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const stopAppSimSchema = z.object({
  simulatorUuid: z.string().describe('UUID of the simulator (obtained from list_simulators)'),
  bundleId: z.string().describe("Bundle identifier of the app to stop (e.g., 'com.example.MyApp')"),
});

// Extended params type that supports both UUID and name
interface StopAppSimExtendedParams {
  simulatorUuid?: string;
  simulatorName?: string;
  bundleId: string;
}

export async function stop_app_simLogic(
  params: StopAppSimExtendedParams,
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

  log('info', `Stopping app ${params.bundleId} in simulator ${simulatorUuid}`);

  try {
    const command = ['xcrun', 'simctl', 'terminate', simulatorUuid, params.bundleId];
    const result = await executor(command, 'Stop App in Simulator', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Stop app in simulator operation failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ App ${params.bundleId} stopped successfully in simulator ${simulatorDisplayName || simulatorUuid}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error stopping app in simulator: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Stop app in simulator operation failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'stop_app_sim',
  description: 'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
  schema: stopAppSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(stopAppSimSchema, stop_app_simLogic, getDefaultCommandExecutor),
};
