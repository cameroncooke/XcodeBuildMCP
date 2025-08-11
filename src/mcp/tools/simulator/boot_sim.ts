import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

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
          text: `Simulator booted successfully. Next steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Install an app: install_app_sim({ simulatorUuid: "${params.simulatorUuid}", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })
4. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID", captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "${params.simulatorUuid}", bundleId: "YOUR_APP_BUNDLE_ID" })`,
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
    "Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
  schema: bootSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(bootSimSchema, boot_simLogic, getDefaultCommandExecutor),
};
