import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';

interface StopMacAppParams {
  appName?: string;
  processId?: number;
}

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
  description: 'Stops a running macOS application. Can stop by app name or process ID.',
  schema: {
    appName: z
      .string()
      .optional()
      .describe('Name of the application to stop (e.g., "Calculator" or "MyApp")'),
    processId: z.number().optional().describe('Process ID (PID) of the application to stop'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return stop_mac_appLogic(args, getDefaultCommandExecutor());
  },
};
