import { ChildProcess } from 'child_process';
import { Writable } from 'stream';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  activeLogSessions,
  startLogCapture,
  stopLogCapture,
  type SubsystemFilter,
} from '../log_capture.ts';
import type { CommandExecutor } from '../CommandExecutor.ts';
import type { FileSystemExecutor } from '../FileSystemExecutor.ts';

type CallHistoryEntry = {
  command: string[];
  logPrefix?: string;
  useShell?: boolean;
  opts?: { env?: Record<string, string>; cwd?: string };
  detached?: boolean;
};

function createMockExecutorWithCalls(callHistory: CallHistoryEntry[]): CommandExecutor {
  const mockProcess: Partial<ChildProcess> = {};
  Object.assign(mockProcess, {
    pid: 12345,
    stdout: null,
    stderr: null,
    killed: false,
    exitCode: null,
    on: () => mockProcess,
  });

  return async (command, logPrefix, useShell, opts, detached) => {
    callHistory.push({ command, logPrefix, useShell, opts, detached });
    return { success: true, output: '', process: mockProcess as ChildProcess };
  };
}

function expectPredicate(
  call: CallHistoryEntry,
  bundleId: string,
  subsystemFilter: SubsystemFilter,
): void {
  const predicateIndex = call.command.indexOf('--predicate');
  expect(predicateIndex).toBeGreaterThan(-1);
  const predicate = call.command[predicateIndex + 1];

  switch (subsystemFilter) {
    case 'app':
      expect(predicate).toBe(`subsystem == "${bundleId}"`);
      return;
    case 'swiftui':
      expect(predicate).toBe(`subsystem == "${bundleId}" OR subsystem == "com.apple.SwiftUI"`);
      return;
    default: {
      const subsystems = [bundleId, ...subsystemFilter];
      const expected = subsystems.map((s) => `subsystem == "${s}"`).join(' OR ');
      expect(predicate).toBe(expected);
    }
  }
}

type InMemoryFileRecord = { content: string; mtimeMs: number };

function createInMemoryFileSystemExecutor(): FileSystemExecutor {
  const files = new Map<string, InMemoryFileRecord>();
  const tempDir = '/virtual/tmp';

  return {
    mkdir: async () => {},
    readFile: async (path) => {
      const record = files.get(path);
      if (!record) {
        throw new Error(`Missing file: ${path}`);
      }
      return record.content;
    },
    writeFile: async (path, content) => {
      files.set(path, { content, mtimeMs: Date.now() });
    },
    createWriteStream: (path) => {
      const chunks: Buffer[] = [];

      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
        final(callback) {
          const existing = files.get(path)?.content ?? '';
          files.set(path, {
            content: existing + Buffer.concat(chunks).toString('utf8'),
            mtimeMs: Date.now(),
          });
          callback();
        },
      });

      return stream as unknown as ReturnType<FileSystemExecutor['createWriteStream']>;
    },
    cp: async () => {},
    readdir: async (dir) => {
      const prefix = `${dir}/`;
      return Array.from(files.keys())
        .filter((filePath) => filePath.startsWith(prefix))
        .map((filePath) => filePath.slice(prefix.length));
    },
    stat: async (path) => {
      const record = files.get(path);
      if (!record) {
        throw new Error(`Missing file: ${path}`);
      }
      return { isDirectory: (): boolean => false, mtimeMs: record.mtimeMs };
    },
    rm: async (path) => {
      files.delete(path);
    },
    existsSync: (path) => files.has(path),
    mkdtemp: async (prefix) => `${tempDir}/${prefix}mock-temp`,
    tmpdir: () => tempDir,
  };
}

beforeEach(() => {
  activeLogSessions.clear();
});

afterEach(() => {
  activeLogSessions.clear();
});

describe('startLogCapture', () => {
  it('creates log stream command with app subsystem by default', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      { simulatorUuid: 'sim-uuid', bundleId: 'io.sentry.app' },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expect(callHistory[0].command).toEqual([
      'xcrun',
      'simctl',
      'spawn',
      'sim-uuid',
      'log',
      'stream',
      '--level=debug',
      '--predicate',
      'subsystem == "io.sentry.app"',
    ]);
    expect(callHistory[0].logPrefix).toBe('OS Log Capture');
    expect(callHistory[0].useShell).toBe(false);
    expect(callHistory[0].detached).toBe(true);
  });

  it('creates log stream command without predicate when filter is all', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        subsystemFilter: 'all',
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expect(callHistory[0].command).toEqual([
      'xcrun',
      'simctl',
      'spawn',
      'sim-uuid',
      'log',
      'stream',
      '--level=debug',
    ]);
  });

  it('creates log stream command with SwiftUI predicate', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        subsystemFilter: 'swiftui',
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expectPredicate(callHistory[0], 'io.sentry.app', 'swiftui');
  });

  it('creates log stream command with custom subsystem predicate', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        subsystemFilter: ['com.apple.UIKit', 'com.apple.CoreData'],
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expectPredicate(callHistory[0], 'io.sentry.app', ['com.apple.UIKit', 'com.apple.CoreData']);
  });

  it('creates console capture and log stream commands when captureConsole is true', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        captureConsole: true,
        args: ['--flag', 'value'],
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(2);
    expect(callHistory[0].command).toEqual([
      'xcrun',
      'simctl',
      'launch',
      '--console-pty',
      '--terminate-running-process',
      'sim-uuid',
      'io.sentry.app',
      '--flag',
      'value',
    ]);
    expect(callHistory[0].logPrefix).toBe('Console Log Capture');
    expect(callHistory[0].useShell).toBe(false);
    expect(callHistory[0].detached).toBe(true);

    expect(callHistory[1].logPrefix).toBe('OS Log Capture');
    expect(callHistory[1].useShell).toBe(false);
    expect(callHistory[1].detached).toBe(true);
  });

  it('passes SIMCTL_CHILD_-prefixed env to console launch executor when env is provided', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        captureConsole: true,
        env: { STAGING_ENABLED: '1', DEBUG: 'true' },
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(2);
    // Console launch call should have prefixed env
    expect(callHistory[0].opts).toEqual({
      env: {
        SIMCTL_CHILD_STAGING_ENABLED: '1',
        SIMCTL_CHILD_DEBUG: 'true',
      },
    });
    // OS log stream call should not have env
    expect(callHistory[1].opts).toBeUndefined();
  });

  it('does not pass env opts to executor when env is not provided', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);
    const fileSystem = createInMemoryFileSystemExecutor();

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'io.sentry.app',
        captureConsole: true,
      },
      executor,
      fileSystem,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory[0].opts).toBeUndefined();
  });
});

describe('stopLogCapture', () => {
  it('returns error when session is missing', async () => {
    const fileSystem = createInMemoryFileSystemExecutor();
    const result = await stopLogCapture('missing-session', fileSystem);

    expect(result.logContent).toBe('');
    expect(result.error).toBe('Log capture session not found: missing-session');
  });

  it('kills active processes and returns log content', async () => {
    const fileSystem = createInMemoryFileSystemExecutor();
    const logFilePath = `${fileSystem.tmpdir()}/session.log`;
    await fileSystem.writeFile(logFilePath, 'test log content');
    const logStream = fileSystem.createWriteStream(logFilePath, { flags: 'a' });

    let killCount = 0;
    const runningProcess = {
      killed: false,
      exitCode: null,
      kill: () => {
        killCount += 1;
      },
    } as unknown as ChildProcess;

    const finishedProcess = {
      killed: false,
      exitCode: 0,
      kill: () => {
        killCount += 1;
      },
    } as unknown as ChildProcess;

    activeLogSessions.set('session-1', {
      processes: [runningProcess, finishedProcess],
      logFilePath,
      simulatorUuid: 'sim-uuid',
      bundleId: 'io.sentry.app',
      logStream,
    });

    const result = await stopLogCapture('session-1', fileSystem);

    expect(result.error).toBeUndefined();
    expect(result.logContent).toBe('test log content');
    expect(killCount).toBe(1);
    expect(activeLogSessions.has('session-1')).toBe(false);
  });
});
