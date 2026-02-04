import { describe, it, expect } from 'vitest';
import { detectXcodeRuntime, isRunningUnderXcode } from '../xcode-process.ts';
import { createCommandMatchingMockExecutor } from '../../test-utils/mock-executors.ts';

describe('isRunningUnderXcode', () => {
  it('detects Xcode by name', () => {
    expect(
      isRunningUnderXcode([
        {
          pid: '1',
          ppid: '0',
          name: 'Xcode',
          command: '/Applications/Xcode.app/Contents/MacOS/Xcode',
        },
      ]),
    ).toBe(true);
  });

  it('detects Xcode by command suffix', () => {
    expect(
      isRunningUnderXcode([
        {
          pid: '1',
          ppid: '0',
          name: 'xcode',
          command: '/Volumes/Dev/Xcode-26.3.app/Contents/MacOS/Xcode',
        },
      ]),
    ).toBe(true);
  });

  it('returns false when no match exists', () => {
    expect(
      isRunningUnderXcode([
        {
          pid: '1',
          ppid: '0',
          name: 'launchd',
          command: '/sbin/launchd',
        },
      ]),
    ).toBe(false);
  });
});

describe('detectXcodeRuntime', () => {
  it('returns true when the process tree contains Xcode', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '123 1 Xcode /Applications/Xcode.app/Contents/MacOS/Xcode',
      },
      '/bin/ps -o pid=,ppid=,comm=,args= -p 1': {
        output: '1 0 launchd /sbin/launchd',
      },
    });

    const result = await detectXcodeRuntime(executor, '123');
    expect(result.error).toBeUndefined();
    expect(result.runningUnderXcode).toBe(true);
  });

  it('returns false when the process tree has no Xcode match', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '123 1 node node /tmp/server.js',
      },
      '/bin/ps -o pid=,ppid=,comm=,args= -p 1': {
        output: '1 0 launchd /sbin/launchd',
      },
    });

    const result = await detectXcodeRuntime(executor, '123');
    expect(result.error).toBeUndefined();
    expect(result.runningUnderXcode).toBe(false);
  });

  it('returns error when process tree collection fails', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        success: false,
        error: 'ps failed',
      },
      'ps -o pid=,ppid=,comm=,args= -p 123': {
        success: false,
        error: 'ps failed',
      },
    });

    const result = await detectXcodeRuntime(executor, '123');
    expect(result.processTree).toEqual([]);
    expect(result.runningUnderXcode).toBe(false);
    expect(result.error).toContain('ps failed');
  });
});
