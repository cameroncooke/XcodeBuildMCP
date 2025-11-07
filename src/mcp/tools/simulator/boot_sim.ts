import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

const bootSimSchemaObject = z.object({
  simulatorId: z.string().describe('UUID of the simulator to use (obtained from list_sims)'),
});

type BootSimParams = z.infer<typeof bootSimSchemaObject>;

const publicSchemaObject = bootSimSchemaObject
  .omit({
    simulatorId: true,
  } as const)
  .strict();

export async function boot_simLogic(
  params: BootSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting xcrun simctl boot request for simulator ${params.simulatorId}`);

  try {
    const command = ['xcrun', 'simctl', 'boot', params.simulatorId];
    const result = await executor(command, 'Boot Simulator', true);

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
          text: `✅ Simulator booted successfully. To make it visible, use: open_sim()

Next steps:
1. Open the Simulator app (makes it visible): open_sim()
2. Install an app: install_app_sim({ simulatorId: "${params.simulatorId}", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorId: "${params.simulatorId}", bundleId: "YOUR_APP_BUNDLE_ID" })`,
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
  description: 'Boots an iOS simulator.',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<BootSimParams>({
    internalSchema: bootSimSchemaObject,
    logicFunction: boot_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
