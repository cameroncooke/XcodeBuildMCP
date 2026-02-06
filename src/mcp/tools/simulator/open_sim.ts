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
      nextSteps: [
        {
          tool: 'boot_sim',
          label: 'Boot a simulator if needed',
          params: { simulatorId: 'UUID_FROM_LIST_SIMS' },
          priority: 1,
        },
        {
          tool: 'start_sim_log_cap',
          label: 'Capture structured logs (app continues running)',
          params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
          priority: 2,
        },
        {
          tool: 'start_sim_log_cap',
          label: 'Capture console + structured logs (app restarts)',
          params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true },
          priority: 3,
        },
        {
          tool: 'launch_app_logs_sim',
          label: 'Launch app with logs in one step',
          params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
          priority: 4,
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

export const schema = openSimSchema.shape;

export const handler = createTypedTool(openSimSchema, open_simLogic, getDefaultCommandExecutor);
