import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';

async function listSimsToolHandler(): Promise<ToolResponse> {
  log('info', 'Starting xcrun simctl list devices request');

  try {
    const command = ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'];
    const result = await executeCommand(command, 'List Simulators');

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
  schema: {
    enabled: z.boolean().optional().describe('Optional flag to enable the listing operation.'),
  },
  handler: listSimsToolHandler,
};
