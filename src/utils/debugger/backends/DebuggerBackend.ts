import type { BreakpointInfo, BreakpointSpec, DebugExecutionState } from '../types.ts';

export interface DebuggerBackend {
  readonly kind: 'lldb-cli' | 'dap';

  attach(opts: { pid: number; simulatorId: string; waitFor?: boolean }): Promise<void>;
  detach(): Promise<void>;

  runCommand(command: string, opts?: { timeoutMs?: number }): Promise<string>;

  addBreakpoint(spec: BreakpointSpec, opts?: { condition?: string }): Promise<BreakpointInfo>;
  removeBreakpoint(id: number): Promise<string>;

  getStack(opts?: { threadIndex?: number; maxFrames?: number }): Promise<string>;
  getVariables(opts?: { frameIndex?: number }): Promise<string>;
  getExecutionState(opts?: { timeoutMs?: number }): Promise<DebugExecutionState>;

  dispose(): Promise<void>;
}
