import type { CommandExecutor } from './execution/index.ts';
import { getProcessTree, type ProcessTreeEntry } from './process-tree.ts';

export type { ProcessTreeEntry };

export type XcodeRuntimeDetection = {
  runningUnderXcode: boolean;
  processTree: ProcessTreeEntry[];
  error?: string;
};

export function isRunningUnderXcode(entries: ProcessTreeEntry[]): boolean {
  return entries.some(
    (entry) =>
      entry.name === 'Xcode' ||
      entry.command.includes('Contents/MacOS/Xcode') ||
      entry.command.includes('com.apple.dt.Xcode'),
  );
}

export async function detectXcodeRuntime(
  executor: CommandExecutor,
  startPid?: string,
): Promise<XcodeRuntimeDetection> {
  const processTreeResult = await getProcessTree(executor, startPid);
  return {
    runningUnderXcode: isRunningUnderXcode(processTreeResult.entries),
    processTree: processTreeResult.entries,
    error: processTreeResult.error,
  };
}
