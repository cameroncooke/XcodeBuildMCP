import { DebuggerManager } from './debugger-manager.ts';

let defaultDebuggerManager: DebuggerManager | null = null;

export function getDefaultDebuggerManager(): DebuggerManager {
  defaultDebuggerManager ??= new DebuggerManager();
  return defaultDebuggerManager;
}

export { DebuggerManager } from './debugger-manager.ts';
export { getDefaultDebuggerToolContext } from './tool-context.ts';
export { resolveSimulatorAppPid } from './simctl.ts';
export { guardUiAutomationAgainstStoppedDebugger } from './ui-automation-guard.ts';
export type {
  BreakpointInfo,
  BreakpointSpec,
  DebugExecutionState,
  DebugExecutionStatus,
  DebugSessionInfo,
  DebuggerBackendKind,
} from './types.ts';
export type { DebuggerToolContext } from './tool-context.ts';
