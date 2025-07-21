/**
 * Device Workspace Plugin: Stop App Device
 *
 * Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and processId.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';

interface StopAppDeviceParams {
  deviceId: string;
  processId: number;
}

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
  schema: {
    deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
    processId: z.number().describe('Process ID (PID) of the app to stop'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return stop_app_deviceLogic(args as StopAppDeviceParams, getDefaultCommandExecutor());
  },
};
