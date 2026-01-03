import { describe, expect, it } from 'vitest';

import type { BreakpointInfo, BreakpointSpec } from '../types.ts';
import type { DebuggerBackend } from '../backends/DebuggerBackend.ts';
import { DebuggerManager } from '../debugger-manager.ts';

function createBackend(overrides: Partial<DebuggerBackend> = {}): DebuggerBackend {
  const base: DebuggerBackend = {
    kind: 'dap',
    attach: async () => {},
    detach: async () => {},
    runCommand: async () => '',
    addBreakpoint: async (spec: BreakpointSpec): Promise<BreakpointInfo> => ({
      id: 1,
      spec,
      rawOutput: '',
    }),
    removeBreakpoint: async () => '',
    getStack: async () => '',
    getVariables: async () => '',
    getExecutionState: async () => ({ status: 'unknown' }),
    dispose: async () => {},
  };

  return { ...base, ...overrides };
}

describe('DebuggerManager DAP selection', () => {
  it('selects dap backend when env is set', async () => {
    const prevEnv = process.env.XCODEBUILDMCP_DEBUGGER_BACKEND;
    process.env.XCODEBUILDMCP_DEBUGGER_BACKEND = 'dap';

    let selected: string | null = null;
    const backend = createBackend({ kind: 'dap' });
    const manager = new DebuggerManager({
      backendFactory: async (kind) => {
        selected = kind;
        return backend;
      },
    });

    await manager.createSession({ simulatorId: 'sim-1', pid: 1000 });

    expect(selected).toBe('dap');

    if (prevEnv === undefined) {
      delete process.env.XCODEBUILDMCP_DEBUGGER_BACKEND;
    } else {
      process.env.XCODEBUILDMCP_DEBUGGER_BACKEND = prevEnv;
    }
  });

  it('disposes backend when attach fails without masking error', async () => {
    const error = new Error('attach failed');
    let disposeCalled = false;

    const backend = createBackend({
      attach: async () => {
        throw error;
      },
      dispose: async () => {
        disposeCalled = true;
        throw new Error('dispose failed');
      },
    });

    const manager = new DebuggerManager({
      backendFactory: async () => backend,
    });

    await expect(
      manager.createSession({ simulatorId: 'sim-1', pid: 2000, backend: 'dap' }),
    ).rejects.toThrow('attach failed');
    expect(disposeCalled).toBe(true);
  });
});
