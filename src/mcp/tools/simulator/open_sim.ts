import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/logging/index.js';
import type { CommandExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const openSimSchema = z.object({});

// Use z.infer for type safety
type OpenSimParams = z.infer<typeof openSimSchema>;

export async function open_simLogic(
  params: OpenSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Starting open simulator request');

  try {
    const command = ['open', '-a', 'Simulator'];
    const result = await executor(command, 'Open Simulator', true);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Open simulator operation failed: ${result.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Simulator app opened successfully`,
        },
        {
          type: 'text',
          text: `Next Steps:
1. Boot a simulator if needed: boot_sim({ simulatorUuid: 'UUID_FROM_LIST_SIMULATORS' })
2. Launch your app and interact with it
3. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during open simulator operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Open simulator operation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  name: 'open_sim',
  description: 'Opens the iOS Simulator app.',
  schema: openSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(openSimSchema, open_simLogic, getDefaultCommandExecutor),
};
