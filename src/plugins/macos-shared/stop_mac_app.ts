import { z } from 'zod';
import { log } from '../../utils/index.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { ToolResponse } from '../../types/common.js';

const execPromise = promisify(exec);

// Executive function type for dependency injection
type ExecFunction = (command: string) => Promise<{ stdout: string; stderr: string }>;

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
  async handler(args: Record<string, unknown>, executor?: ExecFunction): Promise<ToolResponse> {
    const params = args;
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
      let command;

      if (params.processId) {
        // Stop by process ID
        command = `kill ${params.processId}`;
      } else {
        // Stop by app name - try pkill first, then osascript as fallback
        command = `pkill -f "${params.appName}" || osascript -e 'tell application "${params.appName}" to quit'`;
      }

      const execFunction = executor || execPromise;
      await execFunction(command);

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
  },
};
