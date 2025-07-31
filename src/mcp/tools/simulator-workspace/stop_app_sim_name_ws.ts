import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const stopAppSimNameWsSchema = z.object({
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16')"),
  bundleId: z.string().describe("Bundle identifier of the app to stop (e.g., 'com.example.MyApp')"),
});

// Use z.infer for type safety
type StopAppSimNameWsParams = z.infer<typeof stopAppSimNameWsSchema>;

export async function stop_app_sim_name_wsLogic(
  params: StopAppSimNameWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
  if (!simulatorNameValidation.isValid) {
    return simulatorNameValidation.errorResponse!;
  }

  const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
  if (!bundleIdValidation.isValid) {
    return bundleIdValidation.errorResponse!;
  }

  log('info', `Stopping app ${params.bundleId} in simulator named ${params.simulatorName}`);

  try {
    // Step 1: Find simulator by name first
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
      const devices = simulatorsData.devices[runtime];
      if (Array.isArray(devices)) {
        for (const device of devices) {
          if (
            typeof device === 'object' &&
            device !== null &&
            'name' in device &&
            'udid' in device &&
            typeof device.name === 'string' &&
            typeof device.udid === 'string' &&
            device.name === params.simulatorName
          ) {
            foundSimulator = {
              udid: device.udid,
              name: device.name,
            };
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
    log('info', `Found simulator for termination: ${foundSimulator.name} (${simulatorUuid})`);

    // Step 2: Stop the app
    const command: string[] = [
      'xcrun',
      'simctl',
      'terminate',
      simulatorUuid,
      params.bundleId as string,
    ];

    const result = await executor(command, 'Stop App in Simulator', true);

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
          text: `✅ App ${params.bundleId} stopped successfully in simulator ${params.simulatorName} (${simulatorUuid})`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during stop app in simulator operation: ${errorMessage}`);
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
  name: 'stop_app_sim_name_ws',
  description:
    'Stops an app running in an iOS simulator by simulator name. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.',
  schema: stopAppSimNameWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    stopAppSimNameWsSchema,
    stop_app_sim_name_wsLogic,
    getDefaultCommandExecutor,
  ),
};
