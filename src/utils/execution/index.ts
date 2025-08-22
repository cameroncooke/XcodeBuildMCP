/**
 * Focused execution facade.
 * Prefer importing from 'utils/execution/index.js' instead of the legacy utils barrel.
 */
export { getDefaultCommandExecutor, getDefaultFileSystemExecutor } from '../command.ts';

// Types
export type { CommandExecutor, CommandResponse, CommandExecOptions } from '../CommandExecutor.ts';
export type { FileSystemExecutor } from '../FileSystemExecutor.ts';
