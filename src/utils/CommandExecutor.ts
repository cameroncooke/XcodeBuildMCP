import { ChildProcess } from 'child_process';

export interface CommandExecOptions {
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Command executor function type for dependency injection
 */
export type CommandExecutor = (
  command: string[],
  logPrefix?: string,
  useShell?: boolean,
  opts?: CommandExecOptions,
  detached?: boolean,
) => Promise<CommandResponse>;
/**
 * Command execution response interface
 */

export interface CommandResponse {
  success: boolean;
  output: string;
  error?: string;
  process: ChildProcess;
  exitCode?: number;
}
