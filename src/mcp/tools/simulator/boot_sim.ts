import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const bootSimSchemaObject = z.object({
  simulatorId: z.string().describe('UUID of the simulator to use (obtained from list_sims)'),
});

type BootSimParams = z.infer<typeof bootSimSchemaObject>;

const publicSchemaObject = z.strictObject(
  bootSimSchemaObject.omit({
    simulatorId: true,
  } as const).shape,
);

export async function boot_simLogic(
  params: BootSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting xcrun simctl boot request for simulator ${params.simulatorId}`);

  try {
    const command = ['xcrun', 'simctl', 'boot', params.simulatorId];
    const result = await executor(command, 'Boot Simulator', false);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Boot simulator operation failed: ${result.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Simulator booted successfully.`,
        },
      ],
      nextSteps: [
        {
          tool: 'open_sim',
          label: 'Open the Simulator app (makes it visible)',
          params: {},
          priority: 1,
        },
        {
          tool: 'install_app_sim',
          label: 'Install an app',
          params: { simulatorId: params.simulatorId, appPath: 'PATH_TO_YOUR_APP' },
          priority: 2,
        },
        {
          tool: 'launch_app_sim',
          label: 'Launch an app',
          params: { simulatorId: params.simulatorId, bundleId: 'YOUR_APP_BUNDLE_ID' },
          priority: 3,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during boot simulator operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Boot simulator operation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  name: 'boot_sim',
  description: 'Boot iOS simulator.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: bootSimSchemaObject,
  }),
  annotations: {
    title: 'Boot Simulator',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<BootSimParams>({
    internalSchema: bootSimSchemaObject as unknown as z.ZodType<BootSimParams, unknown>,
    logicFunction: boot_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
