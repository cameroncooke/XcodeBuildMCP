import { z } from 'zod';
import { createTextResponse, createErrorResponse } from '../../../utils/responses/index.js';
import { getProcess, removeProcess, type ProcessInfo } from './active-processes.js';
import { ToolResponse } from '../../../types/common.js';

// Define schema as ZodObject
const swiftPackageStopSchema = z.object({
  pid: z.number().describe('Process ID (PID) of the running executable'),
});

// Use z.infer for type safety
type SwiftPackageStopParams = z.infer<typeof swiftPackageStopSchema>;

/**
 * Process manager interface for dependency injection
 */
export interface ProcessManager {
  getProcess: (pid: number) => ProcessInfo | undefined;
  removeProcess: (pid: number) => boolean;
}

/**
 * Default process manager implementation
 */
const defaultProcessManager: ProcessManager = {
  getProcess,
  removeProcess,
};

/**
 * Get the default process manager instance
 */
export function getDefaultProcessManager(): ProcessManager {
  return defaultProcessManager;
}

/**
 * Create a mock process manager for testing
 */
export function createMockProcessManager(overrides?: Partial<ProcessManager>): ProcessManager {
  return {
    getProcess: () => undefined,
    removeProcess: () => true,
    ...overrides,
  };
}

/**
 * Business logic for stopping a Swift Package executable
 */
export async function swift_package_stopLogic(
  params: SwiftPackageStopParams,
  processManager: ProcessManager = getDefaultProcessManager(),
  timeout: number = 5000,
): Promise<ToolResponse> {
  const processInfo = processManager.getProcess(params.pid);
  if (!processInfo) {
    return createTextResponse(
      `⚠️ No running process found with PID ${params.pid}. Use swift_package_run to check active processes.`,
      true,
    );
  }

  try {
    processInfo.process.kill('SIGTERM');

    // Give it time to terminate gracefully (configurable for testing)
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
      }, timeout);
    });

    processManager.removeProcess(params.pid);

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
    return createErrorResponse('Failed to stop process', message);
  }
}

export default {
  name: 'swift_package_stop',
  description: 'Stops a running Swift Package executable started with swift_package_run',
  schema: swiftPackageStopSchema.shape, // MCP SDK compatibility
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    // Validate parameters using Zod
    const parseResult = swiftPackageStopSchema.safeParse(args);
    if (!parseResult.success) {
      return createErrorResponse(
        'Parameter validation failed',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    return swift_package_stopLogic(parseResult.data);
  },
};
