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
import { log } from './logger.js';

/**
 * Command execution response interface
 */
export interface CommandResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Execute a shell command
 * @param command Command string to execute
 * @returns Promise resolving to command response
 */
export async function executeCommand(command: string): Promise<CommandResponse> {
  log('info', `Executing command: ${command}`);

  return new Promise((resolve, reject) => {
    const process = spawn('sh', ['-c', command], {
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
      };

      resolve(response);
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}
