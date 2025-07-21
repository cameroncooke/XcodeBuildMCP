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
import { tmpdir as osTmpdir } from 'os';
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
  mkdtemp(prefix: string): Promise<string>;
  tmpdir(): string;
}

/**
 * Default executor implementation using spawn (current production behavior)
 * Private instance - use getDefaultCommandExecutor() for access
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

  async readdir(path: string, options?: { withFileTypes?: boolean }): Promise<any[]> {
    const fs = await import('fs/promises');
    return await fs.readdir(path, options as any);
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
 * Create a no-op executor that throws an error if called
 * Use this for tests where an executor is required but should never be called
 * @returns CommandExecutor that throws on invocation
 */
export function createNoopExecutor(): CommandExecutor {
  return async (command) => {
    throw new Error(
      `🚨 NOOP EXECUTOR CALLED! 🚨\n` +
        `Command: ${command.join(' ')}\n` +
        `This executor should never be called in this test context.\n` +
        `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
        `Either fix the test to avoid this code path, or use createMockExecutor() instead.`,
    );
  };
}

/**
 * Create a command-matching mock executor for testing multi-command scenarios
 * Perfect for tools that execute multiple commands (like screenshot: simctl + sips)
 *
 * @param commandMap - Map of command patterns to their mock responses
 * @returns CommandExecutor that matches commands and returns appropriate responses
 *
 * @example
 * ```typescript
 * const mockExecutor = createCommandMatchingMockExecutor({
 *   'xcrun simctl': { output: 'Screenshot saved' },
 *   'sips': { output: 'Image optimized' }
 * });
 * ```
 */
export function createCommandMatchingMockExecutor(
  commandMap: Record<
    string,
    {
      success?: boolean;
      output?: string;
      error?: string;
      process?: any;
    }
  >,
): CommandExecutor {
  return async (command, _logPrefix, _useShell, _env) => {
    const commandStr = command.join(' ');

    // Find matching command pattern
    const matchedKey = Object.keys(commandMap).find((key) => commandStr.includes(key));

    if (!matchedKey) {
      throw new Error(
        `🚨 UNEXPECTED COMMAND! 🚨\n` +
          `Command: ${commandStr}\n` +
          `Expected one of: ${Object.keys(commandMap).join(', ')}\n` +
          `Available patterns: ${JSON.stringify(Object.keys(commandMap), null, 2)}`,
      );
    }

    const result = commandMap[matchedKey];

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

    return {
      success: result.success ?? true, // Success by default (as discussed)
      output: result.output ?? '',
      error: result.error,
      process: result.process ?? mockProcess,
    };
  };
}

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
    mkdtemp: async (): Promise<string> => '/tmp/mock-temp-123456',
    tmpdir: (): string => '/tmp',
    ...overrides,
  };
}

/**
 * Create a no-op file system executor that throws an error if called
 * Use this for tests where an executor is required but should never be called
 * @returns CommandExecutor that throws on invocation
 */
export function createNoopFileSystemExecutor(): FileSystemExecutor {
  return {
    mkdir: async (): Promise<void> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    readFile: async (): Promise<string> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    writeFile: async (): Promise<void> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    cp: async (): Promise<void> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    readdir: async (): Promise<any[]> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    rm: async (): Promise<void> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    existsSync: (): boolean => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    stat: async (): Promise<{ isDirectory(): boolean }> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    mkdtemp: async (): Promise<string> => {
      throw new Error(
        `🚨 NOOP FILESYSTEM EXECUTOR CALLED! 🚨\n` +
          `This executor should never be called in this test context.\n` +
          `If you see this error, it means the test is exercising a code path that wasn't expected.\n` +
          `Either fix the test to avoid this code path, or use createMockFileSystemExecutor() instead.`,
      );
    },
    tmpdir: (): string => '/tmp',
  };
}
