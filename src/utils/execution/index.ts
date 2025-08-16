/**
 * Focused execution facade.
 * Prefer importing from 'utils/execution/index.js' instead of the legacy utils barrel.
 */
export { getDefaultCommandExecutor, getDefaultFileSystemExecutor } from '../command.js';

// Types
export type { CommandExecutor, CommandResponse } from '../CommandExecutor.js';
export type { FileSystemExecutor } from '../FileSystemExecutor.js';
