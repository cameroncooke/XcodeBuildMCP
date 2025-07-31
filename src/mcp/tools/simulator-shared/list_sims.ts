import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const listSimsSchema = z.object({
  enabled: z.boolean().optional().describe('Optional flag to enable the listing operation.'),
});

// Use z.infer for type safety
type ListSimsParams = z.infer<typeof listSimsSchema>;

interface SimulatorDevice {
  name: string;
  udid: string;
  state: string;
  isAvailable: boolean;
}

interface SimulatorData {
  devices: Record<string, SimulatorDevice[]>;
}

function isSimulatorData(value: unknown): value is SimulatorData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (!obj.devices || typeof obj.devices !== 'object') {
    return false;
  }

  const devices = obj.devices as Record<string, unknown>;
  for (const runtime in devices) {
    const deviceList = devices[runtime];
    if (!Array.isArray(deviceList)) {
      return false;
    }

    for (const device of deviceList) {
      if (!device || typeof device !== 'object') {
        return false;
      }

      const deviceObj = device as Record<string, unknown>;
      if (
        typeof deviceObj.name !== 'string' ||
        typeof deviceObj.udid !== 'string' ||
        typeof deviceObj.state !== 'string' ||
        typeof deviceObj.isAvailable !== 'boolean'
      ) {
        return false;
      }
    }
  }

  return true;
}

export async function list_simsLogic(
  params: ListSimsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Starting xcrun simctl list devices request');

  try {
    const command = ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'];
    const result = await executor(command, 'List Simulators', true);

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
      const parsedData: unknown = JSON.parse(result.output);

      if (!isSimulatorData(parsedData)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to parse simulator data: Invalid format',
            },
          ],
        };
      }

      const simulatorsData: SimulatorData = parsedData;
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
        "3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })\n";
      responseText +=
        "4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })";

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
}

export default {
  name: 'list_sims',
  description: 'Lists available iOS simulators with their UUIDs. ',
  schema: listSimsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(listSimsSchema, list_simsLogic, getDefaultCommandExecutor),
};
