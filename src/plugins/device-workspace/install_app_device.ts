/**
 * Device Workspace Plugin: Install App Device
 *
 * Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and appPath.
 */

import { z } from 'zod';
import { log, executeCommand } from '../../utils/index.js';

export default {
  name: 'install_app_device',
  description:
    'Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.',
  schema: {
    deviceId: z
      .string()
      .min(1, 'Device ID cannot be empty')
      .describe('UDID of the device (obtained from list_devices)'),
    appPath: z
      .string()
      .describe('Path to the .app bundle to install (full path to the .app directory)'),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const { deviceId, appPath } = args;

    log('info', `Installing app on device ${deviceId}`);

    try {
      const result = await executeCommand(
        ['xcrun', 'devicectl', 'device', 'install', 'app', '--device', deviceId, appPath],
        'Install app on device',
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to install app: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ App installed successfully on device ${deviceId}\n\n${result.output}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error installing app on device: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to install app on device: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  },
};
