import type { CommandExecutor } from '../execution/index.ts';
import { getDefaultCommandExecutor } from '../execution/index.ts';
import type { DebuggerManager } from './debugger-manager.ts';
import { getDefaultDebuggerManager } from './index.ts';

export type DebuggerToolContext = {
  executor: CommandExecutor;
  debugger: DebuggerManager;
};

let _testContextOverride: DebuggerToolContext | null = null;

export function __setTestDebuggerToolContextOverride(ctx: DebuggerToolContext | null): void {
  _testContextOverride = ctx;
}

export function __clearTestDebuggerToolContextOverride(): void {
  _testContextOverride = null;
}

export function getDefaultDebuggerToolContext(): DebuggerToolContext {
  if ((process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') && _testContextOverride) {
    return _testContextOverride;
  }
  return {
    executor: getDefaultCommandExecutor(),
    debugger: getDefaultDebuggerManager(),
  };
}
