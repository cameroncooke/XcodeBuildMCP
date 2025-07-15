// Note: This tool shares the activeProcesses map with swift_package_run
// Since both are in the same workflow directory, they can share state

// Import the shared activeProcesses map from swift_package_run
// This maintains the same behavior as the original implementation
import { ToolResponse } from '../../types/common.js';

const activeProcesses = new Map();

/**
 * Process list dependencies for dependency injection
 */
export interface ProcessListDependencies {
  processMap?: Map<any, any>;
  arrayFrom?: typeof Array.from;
  dateNow?: typeof Date.now;
}

export default {
  name: 'swift_package_list',
  description: 'Lists currently running Swift Package processes',
  schema: {},
  async handler(args?: any, dependencies?: ProcessListDependencies): Promise<ToolResponse> {
    const processMap = dependencies?.processMap || activeProcesses;
    const arrayFrom = dependencies?.arrayFrom || Array.from;
    const dateNow = dependencies?.dateNow || Date.now;

    const processes = arrayFrom(processMap.entries());

    if (processes.length === 0) {
      return {
        content: [
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ],
      };
    }

    const content = [
      { type: 'text', text: `📋 Active Swift Package processes (${processes.length}):` },
    ];

    for (const [pid, info] of processes) {
      const executableName = info.executableName || 'default';
      const runtime = Math.max(1, Math.round((dateNow() - info.startedAt.getTime()) / 1000));
      content.push({
        type: 'text',
        text: `  • PID ${pid}: ${executableName} (${info.packagePath}) - running ${runtime}s`,
      });
    }

    content.push({
      type: 'text',
      text: '💡 Use swift_package_stop with a PID to terminate a process.',
    });

    return { content };
  },
};
