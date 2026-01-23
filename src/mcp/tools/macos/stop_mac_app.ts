import * as z from 'zod';
import { log } from '../../../utils/logging/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const stopMacAppSchema = z.object({
  appName: z.string().optional(),
  processId: z.number().optional(),
});

// Use z.infer for type safety
type StopMacAppParams = z.infer<typeof stopMacAppSchema>;

export async function stop_mac_appLogic(
  params: StopMacAppParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  if (!params.appName && !params.processId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Either appName or processId must be provided.',
        },
      ],
      isError: true,
    };
  }

  log(
    'info',
    `Stopping macOS app: ${params.processId ? `PID ${params.processId}` : params.appName}`,
  );

  try {
    let command: string[];

    if (params.processId) {
      // Stop by process ID
      command = ['kill', String(params.processId)];
    } else {
      // Stop by app name - use shell command with fallback for complex logic
      command = [
        'sh',
        '-c',
        `pkill -f "${params.appName}" || osascript -e 'tell application "${params.appName}" to quit'`,
      ];
    }

    await executor(command, 'Stop macOS App');

    return {
      content: [
        {
          type: 'text',
          text: `✅ macOS app stopped successfully: ${params.processId ? `PID ${params.processId}` : params.appName}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error stopping macOS app: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Stop macOS app operation failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'stop_mac_app',
  description: 'Stop macOS app.',
  schema: stopMacAppSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Stop macOS App',
    destructiveHint: true,
  },
  handler: createTypedTool(stopMacAppSchema, stop_mac_appLogic, getDefaultCommandExecutor),
};
