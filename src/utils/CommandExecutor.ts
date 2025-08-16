import { ChildProcess } from 'child_process';

/**
 * Command executor function type for dependency injection
 */
export type CommandExecutor = (
  command: string[],
  logPrefix?: string,
  useShell?: boolean,
  env?: Record<string, string>,
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
}
