/**
 * Command Utilities - Generic command execution utilities
 *
 * This utility module provides functions for executing shell commands.
 * It serves as a foundation for other utility modules that need to execute commands.
 *
 * Responsibilities:
 * - Executing shell commands with proper argument handling
 * - Managing process spawning, output capture, and error handling
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { tmpdir as osTmpdir } from 'os';
import { log } from './logger.js';
import { FileSystemExecutor } from './FileSystemExecutor.ts';
import { CommandExecutor, CommandResponse } from './CommandExecutor.ts';

// Re-export types for backward compatibility
export { CommandExecutor, CommandResponse } from './CommandExecutor.js';
export { FileSystemExecutor } from './FileSystemExecutor.js';

/**
 * Default executor implementation using spawn (current production behavior)
 * Private instance - use getDefaultCommandExecutor() for access
 * @param command An array of command and arguments
 * @param logPrefix Prefix for logging
 * @param useShell Whether to use shell execution (true) or direct execution (false)
 * @param env Additional environment variables
 * @param detached Whether to spawn process without waiting for completion (for streaming/background processes)
 * @returns Promise resolving to command response with the process
 */
async function defaultExecutor(
  command: string[],
  logPrefix?: string,
  useShell: boolean = true,
  env?: Record<string, string>,
  detached: boolean = false,
): Promise<CommandResponse> {
  // Properly escape arguments for shell
  let escapedCommand = command;
  if (useShell) {
    // For shell execution, we need to format as ['sh', '-c', 'full command string']
    const commandString = command
      .map((arg) => {
        // If the argument contains spaces or special characters, wrap it in quotes
        // Ensure existing quotes are escaped
        if (/[\s,"'=]/.test(arg) && !/^".*"$/.test(arg)) {
          // Check if needs quoting and isn't already quoted
          return `"${arg.replace(/(["\\])/g, '\\$1')}"`; // Escape existing quotes and backslashes
        }
        return arg;
      })
      .join(' ');

    escapedCommand = ['sh', '-c', commandString];
  }

  // Log the actual command that will be executed
  const displayCommand =
    useShell && escapedCommand.length === 3 ? escapedCommand[2] : escapedCommand.join(' ');
  log('info', `Executing ${logPrefix ?? ''} command: ${displayCommand}`);

  return new Promise((resolve, reject) => {
    const executable = escapedCommand[0];
    const args = escapedCommand.slice(1);

    const spawnOpts: Parameters<typeof spawn>[2] = {
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, pipe stdout/stderr
    };

    if (env) {
      spawnOpts.env = { ...process.env, ...env };
    }

    const childProcess = spawn(executable, args, spawnOpts);

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // For detached processes, handle differently to avoid race conditions
    if (detached) {
      // For detached processes, only wait for spawn success/failure
      let resolved = false;

      childProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      // Give a small delay to ensure the process starts successfully
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (childProcess.pid) {
            resolve({
              success: true,
              output: '', // No output for detached processes
              process: childProcess,
            });
          } else {
            resolve({
              success: false,
              output: '',
              error: 'Failed to start detached process',
              process: childProcess,
            });
          }
        }
      }, 100);
    } else {
      // For non-detached processes, handle normally
      childProcess.on('close', (code) => {
        const success = code === 0;
        const response: CommandResponse = {
          success,
          output: stdout,
          error: success ? undefined : stderr,
          process: childProcess,
        };

        resolve(response);
      });

      childProcess.on('error', (err) => {
        reject(err);
      });
    }
  });
}

/**
 * Default file system executor implementation using Node.js fs/promises
 * Private instance - use getDefaultFileSystemExecutor() for access
 */
const defaultFileSystemExecutor: FileSystemExecutor = {
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path, options);
  },

  async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(path, encoding);
    return content;
  },

  async writeFile(path: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, content, encoding);
  },

  async cp(source: string, destination: string, options?: { recursive?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    await fs.cp(source, destination, options);
  },

  async readdir(path: string, options?: { withFileTypes?: boolean }): Promise<unknown[]> {
    const fs = await import('fs/promises');
    return await fs.readdir(path, options as Record<string, unknown>);
  },

  async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    await fs.rm(path, options);
  },

  existsSync(path: string): boolean {
    return existsSync(path);
  },

  async stat(path: string): Promise<{ isDirectory(): boolean }> {
    const fs = await import('fs/promises');
    return await fs.stat(path);
  },

  async mkdtemp(prefix: string): Promise<string> {
    const fs = await import('fs/promises');
    return await fs.mkdtemp(prefix);
  },

  tmpdir(): string {
    return osTmpdir();
  },
};

/**
 * Get default command executor with test safety
 * Throws error if used in test environment to ensure proper mocking
 */
export function getDefaultCommandExecutor(): CommandExecutor {
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
    throw new Error(
      `🚨 REAL SYSTEM EXECUTOR DETECTED IN TEST! 🚨\n` +
        `This test is trying to use the default command executor instead of a mock.\n` +
        `Fix: Pass createMockExecutor() as the commandExecutor parameter in your test.\n` +
        `Example: await plugin.handler(args, createMockExecutor({success: true}), mockFileSystem)\n` +
        `See docs/TESTING.md for proper testing patterns.`,
    );
  }
  return defaultExecutor;
}

/**
 * Get default file system executor with test safety
 * Throws error if used in test environment to ensure proper mocking
 */
export function getDefaultFileSystemExecutor(): FileSystemExecutor {
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
    throw new Error(
      `🚨 REAL FILESYSTEM EXECUTOR DETECTED IN TEST! 🚨\n` +
        `This test is trying to use the default filesystem executor instead of a mock.\n` +
        `Fix: Pass createMockFileSystemExecutor() as the fileSystemExecutor parameter in your test.\n` +
        `Example: await plugin.handler(args, mockCmd, createMockFileSystemExecutor())\n` +
        `See docs/TESTING.md for proper testing patterns.`,
    );
  }
  return defaultFileSystemExecutor;
}
