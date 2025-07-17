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

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { log } from './logger.js';

/**
 * Command execution response interface
 */
export interface CommandResponse {
  success: boolean;
  output: string;
  error?: string;
  process: ChildProcess;
}

/**
 * Command executor function type for dependency injection
 */
export type CommandExecutor = (
  command: string[],
  logPrefix?: string,
  useShell?: boolean,
  env?: Record<string, string>,
) => Promise<CommandResponse>;

/**
 * File system executor interface for dependency injection
 */
export interface FileSystemExecutor {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string, encoding?: BufferEncoding): Promise<void>;
  cp(source: string, destination: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string, options?: { withFileTypes?: boolean }): Promise<any[]>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  existsSync(path: string): boolean;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
}

/**
 * Default executor implementation using spawn (current production behavior)
 * @param command An array of command and arguments
 * @param logPrefix Prefix for logging
 * @param useShell Whether to use shell execution (true) or direct execution (false)
 * @param env Additional environment variables
 * @param spawnOptions Additional spawn options like cwd
 * @returns Promise resolving to command response with the process
 */
async function defaultExecutor(
  command: string[],
  logPrefix?: string,
  useShell: boolean = true,
  env?: Record<string, string>,
): Promise<CommandResponse> {
  // CRITICAL: Detect real system calls during tests
  // TODO: Enable this guard after fixing all remaining test mocking issues
  // if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
  //   throw new Error(
  //     `🚨 REAL SYSTEM CALL DETECTED IN TEST! 🚨\n` +
  //     `Command: ${command.join(' ')}\n` +
  //     `This test is making real system calls instead of using mocked child_process.spawn.\n` +
  //     `Fix: Add 'vi.mock('child_process', () => ({ spawn: vi.fn() }))' to your test file.\n` +
  //     `See CLAUDE.md for proper testing patterns.`
  //   );
  // }

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
  log('info', `Executing ${logPrefix || ''} command: ${displayCommand}`);

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

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

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
  });
}

/**
 * Execute a command with optional dependency injection for testing
 * @param command An array of command and arguments
 * @param logPrefix Prefix for logging
 * @param useShell Whether to use shell execution (true) or direct execution (false)
 * @param env Additional environment variables
 * @param executor Optional command executor for dependency injection (testing)
 * @returns Promise resolving to command response with the process
 */
export async function executeCommand(
  command: string[],
  logPrefix?: string,
  useShell: boolean = true,
  env?: Record<string, string>,
  executor: CommandExecutor = defaultExecutor,
): Promise<CommandResponse> {
  return executor(command, logPrefix, useShell, env);
}

/**
 * Execute a command with working directory support
 * @param command An array of command and arguments
 * @param logPrefix Prefix for logging
 * @param useShell Whether to use shell execution (true) or direct execution (false)
 * @param env Additional environment variables
 * @param cwd Working directory for the command
 * @param executor Optional command executor for dependency injection (testing)
 * @returns Promise resolving to command response with the process
 */
export async function executeCommandWithCwd(
  command: string[],
  logPrefix?: string,
  useShell: boolean = true,
  env?: Record<string, string>,
  cwd?: string,
  executor: CommandExecutor = defaultExecutor,
): Promise<CommandResponse> {
  // Create a custom executor that handles cwd
  const cwdExecutor: CommandExecutor = async (cmd, prefix, shell, environment) => {
    // We need to handle cwd at the spawn level
    const originalExecutor = executor === defaultExecutor ? defaultExecutor : executor;

    if (cwd && executor === defaultExecutor) {
      // For default executor, we need to create a modified version that supports cwd
      return new Promise((resolve, reject) => {
        const escapedCommand = shell ? ['sh', '-c', cmd.join(' ')] : cmd;
        const executable = escapedCommand[0];
        const args = escapedCommand.slice(1);

        const spawnOpts: Parameters<typeof spawn>[2] = {
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: cwd,
        };

        if (environment) {
          spawnOpts.env = { ...process.env, ...environment };
        }

        const childProcess = spawn(executable, args, spawnOpts);

        let stdout = '';
        let stderr = '';

        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        childProcess.on('close', (code) => {
          const success = code === 0;
          resolve({
            success,
            output: stdout,
            error: success ? undefined : stderr,
            process: childProcess,
          });
        });

        childProcess.on('error', (err) => {
          reject(err);
        });
      });
    } else {
      // For other executors, just call them normally (they should handle cwd in their own way)
      return originalExecutor(cmd, prefix, shell, environment);
    }
  };

  return cwdExecutor(command, logPrefix, useShell, env);
}

/**
 * Create a mock executor for testing
 * @param result Mock command result or error to throw
 * @returns Mock executor function
 */
export function createMockExecutor(
  result:
    | {
        success?: boolean;
        output?: string;
        error?: string;
        process?: any;
      }
    | Error
    | string,
): CommandExecutor {
  // If result is Error or string, return executor that rejects
  if (result instanceof Error || typeof result === 'string') {
    return async () => {
      throw result;
    };
  }

  const mockProcess = {
    pid: 12345,
    stdout: null,
    stderr: null,
    stdin: null,
    stdio: [null, null, null],
    killed: false,
    connected: false,
    exitCode: result.success === false ? 1 : 0,
    signalCode: null,
    spawnargs: [],
    spawnfile: 'sh',
  };

  return async (_command, _logPrefix, _useShell, _env) => ({
    success: result.success ?? true,
    output: result.output ?? '',
    error: result.error,
    process: result.process ?? mockProcess,
  });
}

/**
 * Default file system executor implementation using Node.js fs/promises
 */
export const defaultFileSystemExecutor: FileSystemExecutor = {
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

  async readdir(path: string, options?: { withFileTypes?: boolean }): Promise<any[]> {
    const fs = await import('fs/promises');
    return await fs.readdir(path, options);
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
};

/**
 * Create a mock file system executor for testing
 */
export function createMockFileSystemExecutor(
  overrides?: Partial<FileSystemExecutor>,
): FileSystemExecutor {
  return {
    mkdir: async (): Promise<void> => {},
    readFile: async (): Promise<string> => 'mock file content',
    writeFile: async (): Promise<void> => {},
    cp: async (): Promise<void> => {},
    readdir: async (): Promise<any[]> => [],
    rm: async (): Promise<void> => {},
    existsSync: (): boolean => false,
    stat: async (): Promise<{ isDirectory(): boolean }> => ({ isDirectory: (): boolean => true }),
    ...overrides,
  };
}

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
        `See TESTING.md for proper testing patterns.`,
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
        `See TESTING.md for proper testing patterns.`,
    );
  }
  return defaultFileSystemExecutor;
}
