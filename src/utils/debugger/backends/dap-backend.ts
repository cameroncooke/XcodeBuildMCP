import type { DebuggerBackend } from './DebuggerBackend.ts';
import type { BreakpointInfo, BreakpointSpec } from '../types.ts';

const DAP_ERROR_MESSAGE =
  'DAP backend is not implemented yet. Set XCODEBUILDMCP_DEBUGGER_BACKEND=lldb-cli to use the default LLDB CLI backend.';

class DapBackend implements DebuggerBackend {
  readonly kind = 'dap' as const;

  async attach(neverOpts: { pid: number; simulatorId: string; waitFor?: boolean }): Promise<void> {
    void neverOpts;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async detach(): Promise<void> {
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async runCommand(neverCommand: string, neverOpts?: { timeoutMs?: number }): Promise<string> {
    void neverCommand;
    void neverOpts;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async addBreakpoint(neverSpec: BreakpointSpec): Promise<BreakpointInfo> {
    void neverSpec;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async removeBreakpoint(neverId: number): Promise<string> {
    void neverId;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async getStack(neverOpts?: { threadIndex?: number; maxFrames?: number }): Promise<string> {
    void neverOpts;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async getVariables(neverOpts?: { frameIndex?: number }): Promise<string> {
    void neverOpts;
    throw new Error(DAP_ERROR_MESSAGE);
  }

  async dispose(): Promise<void> {
    throw new Error(DAP_ERROR_MESSAGE);
  }
}

export async function createDapBackend(): Promise<DebuggerBackend> {
  return new DapBackend();
}
