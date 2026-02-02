import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { validateFileExists } from '../../../utils/validation/index.ts';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const installAppSimSchemaObject = z.object({
  simulatorId: z.string().describe('UUID of the simulator to use (obtained from list_sims)'),
  appPath: z.string(),
});

type InstallAppSimParams = z.infer<typeof installAppSimSchemaObject>;

const publicSchemaObject = z.strictObject(
  installAppSimSchemaObject.omit({
    simulatorId: true,
  } as const).shape,
);

export async function install_app_simLogic(
  params: InstallAppSimParams,
  executor: CommandExecutor,
  fileSystem?: FileSystemExecutor,
): Promise<ToolResponse> {
  const appPathExistsValidation = validateFileExists(params.appPath, fileSystem);
  if (!appPathExistsValidation.isValid) {
    return appPathExistsValidation.errorResponse!;
  }

  log('info', `Starting xcrun simctl install request for simulator ${params.simulatorId}`);

  try {
    const command = ['xcrun', 'simctl', 'install', params.simulatorId, params.appPath];
    const result = await executor(command, 'Install App in Simulator', false, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Install app in simulator operation failed: ${result.error}`,
          },
        ],
      };
    }

    let bundleId = '';
    try {
      const bundleIdResult = await executor(
        ['defaults', 'read', `${params.appPath}/Info`, 'CFBundleIdentifier'],
        'Extract Bundle ID',
        false,
        undefined,
      );
      if (bundleIdResult.success) {
        bundleId = bundleIdResult.output.trim();
      }
    } catch (error) {
      log('warning', `Could not extract bundle ID from app: ${error}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `App installed successfully in simulator ${params.simulatorId}.`,
        },
      ],
      nextSteps: [
        {
          tool: 'open_sim',
          label: 'Open the Simulator app',
          params: {},
          priority: 1,
        },
        {
          tool: 'launch_app_sim',
          label: 'Launch the app',
          params: {
            simulatorId: params.simulatorId,
            bundleId: bundleId || 'YOUR_APP_BUNDLE_ID',
          },
          priority: 2,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during install app in simulator operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Install app in simulator operation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  name: 'install_app_sim',
  description: 'Install app on sim.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: installAppSimSchemaObject,
  }),
  annotations: {
    title: 'Install App Simulator',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<InstallAppSimParams>({
    internalSchema: installAppSimSchemaObject as unknown as z.ZodType<InstallAppSimParams, unknown>,
    logicFunction: install_app_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
