import type { CommandExecutor } from '../execution/index.ts';

export async function resolveSimulatorAppPid(opts: {
  executor: CommandExecutor;
  simulatorId: string;
  bundleId: string;
}): Promise<number> {
  const result = await opts.executor(
    ['xcrun', 'simctl', 'spawn', opts.simulatorId, 'launchctl', 'list'],
    'Resolve simulator app PID',
    true,
  );

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to read simulator process list');
  }

  const lines = result.output.split('\n');
  for (const line of lines) {
    if (!line.includes(opts.bundleId)) continue;

    const columns = line.trim().split(/\s+/);
    const pidToken = columns[0];

    if (!pidToken || pidToken === '-') {
      throw new Error(`App ${opts.bundleId} is not running on simulator ${opts.simulatorId}`);
    }

    const pid = Number(pidToken);
    if (Number.isNaN(pid) || pid <= 0) {
      throw new Error(`Unable to parse PID for ${opts.bundleId} from: ${line}`);
    }

    return pid;
  }

  throw new Error(`No running process found for ${opts.bundleId} on simulator ${opts.simulatorId}`);
}
