import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

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
  async handler(args: any) {
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

    log('info', `Stopping macOS app: ${params.appName || `PID ${params.processId}`}`);

    try {
      let command;

      if (params.processId) {
        // Stop by process ID
        command = `kill ${params.processId}`;
      } else {
        // Stop by app name - try pkill first, then osascript as fallback
        command = `pkill -f "${params.appName}" || osascript -e 'tell application "${params.appName}" to quit'`;
      }

      await execPromise(command);

      return {
        content: [
          {
            type: 'text',
            text: `✅ macOS app stopped successfully: ${params.appName || `PID ${params.processId}`}`,
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