import { ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  activeLogSessions,
  startLogCapture,
  stopLogCapture,
  type SubsystemFilter,
} from '../log_capture.ts';
import { CommandExecutor } from '../CommandExecutor.ts';

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

const createdFiles: string[] = [];

beforeEach(() => {
  activeLogSessions.clear();
});

afterEach(async () => {
  activeLogSessions.clear();
  await Promise.all(
    createdFiles.splice(0).map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors for temp files
      }
    }),
  );
});

describe('startLogCapture', () => {
  it('creates log stream command with app subsystem by default', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);

    const result = await startLogCapture(
      { simulatorUuid: 'sim-uuid', bundleId: 'com.example.app' },
      executor,
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
      'subsystem == "com.example.app"',
    ]);
    expect(callHistory[0].logPrefix).toBe('OS Log Capture');
    expect(callHistory[0].useShell).toBe(true);
    expect(callHistory[0].detached).toBe(true);
  });

  it('creates log stream command without predicate when filter is all', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'com.example.app',
        subsystemFilter: 'all',
      },
      executor,
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

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'com.example.app',
        subsystemFilter: 'swiftui',
      },
      executor,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expectPredicate(callHistory[0], 'com.example.app', 'swiftui');
  });

  it('creates log stream command with custom subsystem predicate', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'com.example.app',
        subsystemFilter: ['com.apple.UIKit', 'com.apple.CoreData'],
      },
      executor,
    );

    expect(result.error).toBeUndefined();
    expect(callHistory).toHaveLength(1);
    expectPredicate(callHistory[0], 'com.example.app', ['com.apple.UIKit', 'com.apple.CoreData']);
  });

  it('creates console capture and log stream commands when captureConsole is true', async () => {
    const callHistory: CallHistoryEntry[] = [];
    const executor = createMockExecutorWithCalls(callHistory);

    const result = await startLogCapture(
      {
        simulatorUuid: 'sim-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
        args: ['--flag', 'value'],
      },
      executor,
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
      'com.example.app',
      '--flag',
      'value',
    ]);
    expect(callHistory[0].logPrefix).toBe('Console Log Capture');
    expect(callHistory[0].useShell).toBe(true);
    expect(callHistory[0].detached).toBe(true);

    expect(callHistory[1].logPrefix).toBe('OS Log Capture');
    expect(callHistory[1].useShell).toBe(true);
    expect(callHistory[1].detached).toBe(true);
  });
});

describe('stopLogCapture', () => {
  it('returns error when session is missing', async () => {
    const result = await stopLogCapture('missing-session');

    expect(result.logContent).toBe('');
    expect(result.error).toBe('Log capture session not found: missing-session');
  });

  it('kills active processes and returns log content', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-capture-test-'));
    const logFilePath = path.join(tempDir, 'session.log');
    await fs.writeFile(logFilePath, 'test log content');
    createdFiles.push(logFilePath);
    const logStream = createWriteStream(logFilePath, { flags: 'a' });

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
      bundleId: 'com.example.app',
      logStream,
    });

    const result = await stopLogCapture('session-1');

    expect(result.error).toBeUndefined();
    expect(result.logContent).toBe('test log content');
    expect(killCount).toBe(1);
    expect(activeLogSessions.has('session-1')).toBe(false);
  });
});
