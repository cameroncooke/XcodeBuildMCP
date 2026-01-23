/**
 * Device Workspace Plugin: Launch App Device
 *
 * Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro).
 * Requires deviceId and bundleId.
 */

import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.ts';
import {
  getDefaultCommandExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import { join } from 'path';

// Type for the launch JSON response
type LaunchDataResponse = {
  result?: {
    process?: {
      processIdentifier?: number;
    };
  };
};

// Define schema as ZodObject
const launchAppDeviceSchema = z.object({
  deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
  bundleId: z.string(),
});

const publicSchemaObject = launchAppDeviceSchema.omit({ deviceId: true } as const);

// Use z.infer for type safety
type LaunchAppDeviceParams = z.infer<typeof launchAppDeviceSchema>;

export async function launch_app_deviceLogic(
  params: LaunchAppDeviceParams,
  executor: CommandExecutor,
  fileSystem: FileSystemExecutor,
): Promise<ToolResponse> {
  const { deviceId, bundleId } = params;

  log('info', `Launching app ${bundleId} on device ${deviceId}`);

  try {
    // Use JSON output to capture process ID
    const tempJsonPath = join(fileSystem.tmpdir(), `launch-${Date.now()}.json`);

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
    let processId: number | undefined;
    try {
      const jsonContent = await fileSystem.readFile(tempJsonPath, 'utf8');
      const parsedData: unknown = JSON.parse(jsonContent);

      // Type guard to validate the parsed data structure
      if (
        parsedData &&
        typeof parsedData === 'object' &&
        'result' in parsedData &&
        parsedData.result &&
        typeof parsedData.result === 'object' &&
        'process' in parsedData.result &&
        parsedData.result.process &&
        typeof parsedData.result.process === 'object' &&
        'processIdentifier' in parsedData.result.process &&
        typeof parsedData.result.process.processIdentifier === 'number'
      ) {
        const launchData = parsedData as LaunchDataResponse;
        processId = launchData.result?.process?.processIdentifier;
      }

      // Clean up temp file
      await fileSystem.rm(tempJsonPath, { force: true }).catch(() => {});
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
  description: 'Launch app on device.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: launchAppDeviceSchema,
  }),
  annotations: {
    title: 'Launch App Device',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<LaunchAppDeviceParams>({
    internalSchema: launchAppDeviceSchema as unknown as z.ZodType<LaunchAppDeviceParams>,
    logicFunction: (params, executor) =>
      launch_app_deviceLogic(params, executor, getDefaultFileSystemExecutor()),
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['deviceId'], message: 'deviceId is required' }],
  }),
};
