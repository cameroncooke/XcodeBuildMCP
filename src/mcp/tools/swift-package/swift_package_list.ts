// Note: This tool shares the activeProcesses map with swift_package_run
// Since both are in the same workflow directory, they can share state

// Import the shared activeProcesses map from swift_package_run
// This maintains the same behavior as the original implementation
import { z } from 'zod';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/command.ts';

interface ProcessInfo {
  executableName?: string;
  startedAt: Date;
  packagePath: string;
}

const activeProcesses = new Map<number, ProcessInfo>();

/**
 * Process list dependencies for dependency injection
 */
export interface ProcessListDependencies {
  processMap?: Map<number, ProcessInfo>;
  arrayFrom?: typeof Array.from;
  dateNow?: typeof Date.now;
}

/**
 * Swift package list business logic - extracted for testability and separation of concerns
 * @param params - Parameters (unused, but maintained for consistency)
 * @param dependencies - Injectable dependencies for testing
 * @returns ToolResponse with process list information
 */
export async function swift_package_listLogic(
  params?: unknown,
  dependencies?: ProcessListDependencies,
): Promise<ToolResponse> {
  const processMap = dependencies?.processMap ?? activeProcesses;
  const arrayFrom = dependencies?.arrayFrom ?? Array.from;
  const dateNow = dependencies?.dateNow ?? Date.now;

  const processes = arrayFrom(processMap.entries());

  if (processes.length === 0) {
    return {
      content: [
        createTextContent('ℹ️ No Swift Package processes currently running.'),
        createTextContent('💡 Use swift_package_run to start an executable.'),
      ],
    };
  }

  const content = [createTextContent(`📋 Active Swift Package processes (${processes.length}):`)];

  for (const [pid, info] of processes) {
    // Use logical OR instead of nullish coalescing to treat empty strings as falsy
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const executableName = info.executableName || 'default';
    const runtime = Math.max(1, Math.round((dateNow() - info.startedAt.getTime()) / 1000));
    content.push(
      createTextContent(
        `  • PID ${pid}: ${executableName} (${info.packagePath}) - running ${runtime}s`,
      ),
    );
  }

  content.push(createTextContent('💡 Use swift_package_stop with a PID to terminate a process.'));

  return { content };
}

// Define schema as ZodObject (empty for this tool)
const swiftPackageListSchema = z.object({});

// Use z.infer for type safety
type SwiftPackageListParams = z.infer<typeof swiftPackageListSchema>;

export default {
  name: 'swift_package_list',
  description: 'Lists currently running Swift Package processes',
  schema: swiftPackageListSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Swift Package List',
    readOnlyHint: true,
  },
  handler: createTypedTool(
    swiftPackageListSchema,
    (params: SwiftPackageListParams) => {
      return swift_package_listLogic(params);
    },
    getDefaultCommandExecutor,
  ),
};
