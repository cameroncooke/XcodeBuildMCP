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
 * Execute a command
 * @param command An array of command and arguments
 * @param logPrefix Prefix for logging
 * @param useShell Whether to use shell execution (true) or direct execution (false)
 * @returns Promise resolving to command response with the process
 */
export async function executeCommand(
  command: string[],
  logPrefix?: string,
  useShell: boolean = true,
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

    const process = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, pipe stdout/stderr
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      const success = code === 0;
      const response: CommandResponse = {
        success,
        output: stdout,
        error: success ? undefined : stderr,
        process,
      };

      resolve(response);
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}
