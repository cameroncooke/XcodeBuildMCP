/**
 * Device Workspace Plugin: Launch App Device
 *
 * Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and bundleId.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

interface LaunchAppDeviceParams {
  deviceId: string;
  bundleId: string;
}

export async function launch_app_deviceLogic(
  params: LaunchAppDeviceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const { deviceId, bundleId } = params;

  log('info', `Launching app ${bundleId} on device ${deviceId}`);

  try {
    // Use JSON output to capture process ID
    const tempJsonPath = join(tmpdir(), `launch-${Date.now()}.json`);

    const result = await executor(
      [
        'xcrun',
        'devicectl',
        'device',
        'process',
        'launch',
        '--device',
        deviceId,
        '--json-output',
        tempJsonPath,
        '--terminate-existing',
        bundleId,
      ],
      'Launch app on device',
      true, // useShell
      undefined, // env
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to launch app: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    // Parse JSON to extract process ID
    let processId;
    try {
      const jsonContent = await fs.readFile(tempJsonPath, 'utf8');
      const launchData = JSON.parse(jsonContent);
      processId = launchData.result?.process?.processIdentifier;

      // Clean up temp file
      await fs.unlink(tempJsonPath).catch(() => {});
    } catch (error) {
      log('warn', `Failed to parse launch JSON output: ${error}`);
    }

    let responseText = `✅ App launched successfully\n\n${result.output}`;

    if (processId) {
      responseText += `\n\nProcess ID: ${processId}`;
      responseText += `\n\nNext Steps:`;
      responseText += `\n1. Interact with your app on the device`;
      responseText += `\n2. Stop the app: stop_app_device({ deviceId: "${deviceId}", processId: ${processId} })`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error launching app on device: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to launch app on device: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'launch_app_device',
  description:
    'Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.',
  schema: {
    deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
    bundleId: z
      .string()
      .describe('Bundle identifier of the app to launch (e.g., "com.example.MyApp")'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return launch_app_deviceLogic(args as LaunchAppDeviceParams, getDefaultCommandExecutor());
  },
};
