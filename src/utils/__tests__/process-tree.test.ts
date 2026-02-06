import { describe, it, expect } from 'vitest';
import { getProcessTree } from '../process-tree.ts';
import { createCommandMatchingMockExecutor } from '../../test-utils/mock-executors.ts';

describe('getProcessTree', () => {
  it('parses pid, ppid, name, and command', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '123 1 Xcode /Applications/Xcode.app/Contents/MacOS/Xcode',
      },
      '/bin/ps -o pid=,ppid=,comm=,args= -p 1': {
        output: '1 0 launchd /sbin/launchd',
      },
    });

    const result = await getProcessTree(executor, '123');
    expect(result.error).toBeUndefined();
    expect(result.entries).toEqual([
      {
        pid: '123',
        ppid: '1',
        name: 'Xcode',
        command: '/Applications/Xcode.app/Contents/MacOS/Xcode',
      },
      {
        pid: '1',
        ppid: '0',
        name: 'launchd',
        command: '/sbin/launchd',
      },
    ]);
  });

  it('handles lines without command args', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '123 1 Xcode',
      },
      '/bin/ps -o pid=,ppid=,comm=,args= -p 1': {
        output: '1 0 launchd',
      },
    });

    const result = await getProcessTree(executor, '123');
    expect(result.error).toBeUndefined();
    expect(result.entries).toEqual([
      {
        pid: '123',
        ppid: '1',
        name: 'Xcode',
        command: '',
      },
      {
        pid: '1',
        ppid: '0',
        name: 'launchd',
        command: '',
      },
    ]);
  });

  it('returns error when ps output is empty', async () => {
    const executor = createCommandMatchingMockExecutor({
      '/bin/ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '',
      },
      'ps -o pid=,ppid=,comm=,args= -p 123': {
        output: '',
      },
    });

    const result = await getProcessTree(executor, '123');
    expect(result.entries).toEqual([]);
    expect(result.error).toContain('ps returned no output for pid 123');
  });

  it('returns error when ps exits unsuccessfully', async () => {
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

    const result = await getProcessTree(executor, '123');
    expect(result.entries).toEqual([]);
    expect(result.error).toContain('ps failed');
  });
});
