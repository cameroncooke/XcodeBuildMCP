import { z } from 'zod';
import { createTextResponse } from '../../utils/index.js';
import { createErrorResponse } from '../../utils/index.js';
import { getProcess, removeProcess } from './active-processes.js';
import { ToolResponse } from '../../types/common.js';

export default {
  name: 'swift_package_stop',
  description: 'Stops a running Swift Package executable started with swift_package_run',
  schema: {
    pid: z.number().describe('Process ID (PID) of the running executable'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const params = args;
    const processInfo = getProcess(params.pid);
    if (!processInfo) {
      return createTextResponse(
        `⚠️ No running process found with PID ${params.pid}. Use swift_package_run to check active processes.`,
        true,
      );
    }

    try {
      processInfo.process.kill('SIGTERM');

      // Give it 5 seconds to terminate gracefully
      await new Promise((resolve) => {
        let terminated = false;

        processInfo.process.on('exit', () => {
          terminated = true;
          resolve(true);
        });

        setTimeout(() => {
          if (!terminated) {
            processInfo.process.kill('SIGKILL');
          }
          resolve(true);
        }, 5000);
      });

      removeProcess(params.pid);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Stopped executable (was running since ${processInfo.startedAt.toISOString()})`,
          },
          {
            type: 'text',
            text: `💡 Process terminated. You can now run swift_package_run again if needed.`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Failed to stop process', message, 'SystemError');
    }
  },
};
