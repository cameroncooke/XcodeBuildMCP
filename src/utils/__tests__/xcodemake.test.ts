import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executorMock } = vi.hoisted(() => ({
  executorMock: vi.fn(),
}));

vi.mock('../command.ts', () => ({
  getDefaultCommandExecutor: () => executorMock,
}));

import { executeXcodemakeCommand } from '../xcodemake.ts';

describe('executeXcodemakeCommand', () => {
  beforeEach(() => {
    executorMock.mockReset();
  });

  it('runs xcodemake using child-process cwd without mutating process cwd', async () => {
    const projectDir = '/tmp/project';
    const originalCwd = process.cwd();
    executorMock.mockResolvedValue({ success: true, output: 'ok' });

    await executeXcodemakeCommand(
      projectDir,
      ['-scheme', 'App', '-project', '/tmp/project/App.xcodeproj'],
      'Build',
    );

    expect(executorMock).toHaveBeenCalledWith(
      ['xcodemake', '-scheme', 'App', '-project', 'App.xcodeproj'],
      'Build',
      false,
      { cwd: projectDir },
    );
    expect(process.cwd()).toBe(originalCwd);
  });

  it('does not mutate process cwd when command execution fails', async () => {
    const projectDir = '/tmp/project';
    const originalCwd = process.cwd();
    executorMock.mockRejectedValue(new Error('xcodemake failed'));

    await expect(executeXcodemakeCommand(projectDir, ['-scheme', 'App'], 'Build')).rejects.toThrow(
      'xcodemake failed',
    );

    expect(process.cwd()).toBe(originalCwd);
  });
});
