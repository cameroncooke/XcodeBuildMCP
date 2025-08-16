import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const bootSimSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
});

// Use z.infer for type safety
type BootSimParams = z.infer<typeof bootSimSchema>;

export async function boot_simLogic(
  params: BootSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting xcrun simctl boot request for simulator ${params.simulatorUuid}`);

  try {
    const command = ['xcrun', 'simctl', 'boot', params.simulatorUuid];
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
2. Install an app: install_app_sim({ simulatorUuid: "${params.simulatorUuid}", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })`,
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
  description:
    "Boots an iOS simulator. After booting, use open_sim() to make the simulator visible. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
  schema: bootSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(bootSimSchema, boot_simLogic, getDefaultCommandExecutor),
};
