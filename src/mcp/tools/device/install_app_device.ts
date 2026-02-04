/**
 * Device Workspace Plugin: Install App Device
 *
 * Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and appPath.
 */

import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const installAppDeviceSchema = z.object({
  deviceId: z
    .string()
    .min(1, { message: 'Device ID cannot be empty' })
    .describe('UDID of the device (obtained from list_devices)'),
  appPath: z.string(),
});

const publicSchemaObject = installAppDeviceSchema.omit({ deviceId: true } as const);

// Use z.infer for type safety
type InstallAppDeviceParams = z.infer<typeof installAppDeviceSchema>;

/**
 * Business logic for installing an app on a physical Apple device
 */
export async function install_app_deviceLogic(
  params: InstallAppDeviceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const { deviceId, appPath } = params;

  log('info', `Installing app on device ${deviceId}`);

  try {
    const result = await executor(
      ['xcrun', 'devicectl', 'device', 'install', 'app', '--device', deviceId, appPath],
      'Install app on device',
      false, // useShell
      undefined, // env
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
}

export default {
  name: 'install_app_device',
  description: 'Install app on device.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: installAppDeviceSchema,
  }),
  annotations: {
    title: 'Install App Device',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<InstallAppDeviceParams>({
    internalSchema: installAppDeviceSchema as unknown as z.ZodType<InstallAppDeviceParams, unknown>,
    logicFunction: install_app_deviceLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['deviceId'], message: 'deviceId is required' }],
  }),
};
