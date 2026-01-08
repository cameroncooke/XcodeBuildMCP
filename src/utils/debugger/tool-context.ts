import type { CommandExecutor } from '../execution/index.ts';
import { getDefaultCommandExecutor } from '../execution/index.ts';
import type { DebuggerManager } from './debugger-manager.ts';
import { getDefaultDebuggerManager } from './index.ts';

export type DebuggerToolContext = {
  executor: CommandExecutor;
  debugger: DebuggerManager;
};

export function getDefaultDebuggerToolContext(): DebuggerToolContext {
  return {
    executor: getDefaultCommandExecutor(),
    debugger: getDefaultDebuggerManager(),
  };
}
