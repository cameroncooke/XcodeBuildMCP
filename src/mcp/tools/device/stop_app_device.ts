/**
 * Device Workspace Plugin: Stop App Device
 *
 * Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and processId.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const stopAppDeviceSchema = z.object({
  deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
  processId: z.number().describe('Process ID (PID) of the app to stop'),
});

// Use z.infer for type safety
type StopAppDeviceParams = z.infer<typeof stopAppDeviceSchema>;

export async function stop_app_deviceLogic(
  params: StopAppDeviceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const { deviceId, processId } = params;

  log('info', `Stopping app with PID ${processId} on device ${deviceId}`);

  try {
    const result = await executor(
      [
        'xcrun',
        'devicectl',
        'device',
        'process',
        'terminate',
        '--device',
        deviceId,
        '--pid',
        processId.toString(),
      ],
      'Stop app on device',
      true, // useShell
      undefined, // env
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to stop app: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ App stopped successfully\n\n${result.output}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error stopping app on device: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to stop app on device: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'stop_app_device',
  description:
    'Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and processId.',
  schema: stopAppDeviceSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(stopAppDeviceSchema, stop_app_deviceLogic, getDefaultCommandExecutor),
};
