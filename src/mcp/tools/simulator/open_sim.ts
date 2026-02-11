import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

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
    const result = await executor(command, 'Open Simulator', false);

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
          text: `Simulator app opened successfully.`,
        },
      ],
      nextStepParams: {
        boot_sim: { simulatorId: 'UUID_FROM_LIST_SIMS' },
        start_sim_log_cap: [
          { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
          { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true },
        ],
        launch_app_logs_sim: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
      },
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

export const schema = openSimSchema.shape;

export const handler = createTypedTool(openSimSchema, open_simLogic, getDefaultCommandExecutor);
