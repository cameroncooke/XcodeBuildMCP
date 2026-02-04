import type { CommandExecutor } from './execution/index.ts';

export type ProcessTreeEntry = {
  pid: string;
  ppid: string;
  name: string;
  command: string;
};

export type ProcessTreeResult = {
  entries: ProcessTreeEntry[];
  error?: string;
};

export async function getProcessTree(
  executor: CommandExecutor,
  startPid = process.pid.toString(),
): Promise<ProcessTreeResult> {
  const results: ProcessTreeEntry[] = [];
  const seen = new Set<string>();
  let currentPid = startPid;
  let lastError: string | undefined;

  const parseLine = (line: string): ProcessTreeEntry | null => {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 3) {
      return null;
    }
    const pid = tokens[0];
    const ppid = tokens[1];
    const name = tokens[2];
    if (!pid || !ppid || !name) {
      return null;
    }
    const command = tokens.slice(3).join(' ');
    return { pid, ppid, name, command };
  };

  const fetchProcessInfo = async (pid: string): Promise<ProcessTreeEntry | null> => {
    const command = ['-o', 'pid=,ppid=,comm=,args=', '-p', pid];
    const attempts = [
      { bin: '/bin/ps', label: 'Get process info (ps)' },
      { bin: 'ps', label: 'Get process info (ps fallback)' },
    ];

    for (const attempt of attempts) {
      try {
        const res = await executor([attempt.bin, ...command], attempt.label);
        if (!res.success) {
          lastError = res.error ?? `ps returned non-zero exit code for pid ${pid}`;
          continue;
        }
        const line = res.output.trim().split('\n')[0]?.trim();
        if (!line) {
          lastError = `ps returned no output for pid ${pid}`;
          continue;
        }
        const parsed = parseLine(line);
        if (!parsed) {
          lastError = `ps output was not parseable for pid ${pid}`;
          continue;
        }
        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return null;
  };

  while (currentPid && currentPid !== '0' && !seen.has(currentPid)) {
    seen.add(currentPid);
    const entry = await fetchProcessInfo(currentPid);
    if (!entry) {
      break;
    }

    results.push(entry);
    if (entry.ppid === entry.pid || entry.ppid === '0') {
      break;
    }
    currentPid = entry.ppid;
  }

  return {
    entries: results,
    error: results.length === 0 ? lastError : undefined,
  };
}
