export type DebuggerBackendKind = 'lldb-cli' | 'dap';

export interface DebugSessionInfo {
  id: string;
  backend: DebuggerBackendKind;
  simulatorId: string;
  pid: number;
  createdAt: number;
  lastUsedAt: number;
}

export type BreakpointSpec =
  | { kind: 'file-line'; file: string; line: number }
  | { kind: 'function'; name: string };

export interface BreakpointInfo {
  id: number;
  spec: BreakpointSpec;
  rawOutput: string;
}
