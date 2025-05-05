/**
 * xcodemake Utilities - Support for using xcodemake as an alternative build strategy
 *
 * This utility module provides functions for using xcodemake (https://github.com/johnno1962/xcodemake)
 * as an alternative build strategy for Xcode projects. xcodemake logs xcodebuild output to generate
 * a Makefile for an Xcode project, allowing for faster incremental builds using the "make" command.
 *
 * Responsibilities:
 * - Checking if xcodemake is enabled via environment variable
 * - Executing xcodemake commands with proper argument handling
 * - Converting xcodebuild arguments to xcodemake arguments
 * - Handling xcodemake-specific output and error reporting
 * - Auto-downloading xcodemake if enabled but not found
 */

import { spawn, exec } from 'child_process';
import { log } from './logger.js';
import { XcodeCommandResponse, CommandResponse } from '../types/common.js';
import { existsSync, readdirSync } from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

// Environment variable to control xcodemake usage
export const XCODEMAKE_ENV_VAR = 'INCREMENTAL_BUILDS_ENABLED';

// Store the overridden path for xcodemake if needed
let overriddenXcodemakePath: string | null = null;

/**
 * Check if xcodemake is enabled via environment variable
 * @returns boolean indicating if xcodemake should be used
 */
export function isXcodemakeEnabled(): boolean {
  const envValue = process.env[XCODEMAKE_ENV_VAR];
  return envValue === '1' || envValue === 'true' || envValue === 'yes';
}

/**
 * Execute a shell command
 * @param command Command string to execute
 * @returns Promise resolving to command response
 */
async function executeCommand(command: string): Promise<CommandResponse> {
  log('info', `Executing command: ${command}`);
  const execPromise = promisify(exec);

  try {
    const { stdout, stderr } = await execPromise(command);
    return {
      success: true,
      output: stdout,
      error: stderr.length > 0 ? stderr : undefined,
    };
  } catch (error) {
    const err = error as { message: string; stderr?: string };
    return {
      success: false,
      output: '',
      error: err.stderr || err.message,
    };
  }
}

/**
 * Get the xcodemake command to use
 * @returns The command string for xcodemake
 */
function getXcodemakeCommand(): string {
  return overriddenXcodemakePath || 'xcodemake';
}

/**
 * Override the xcodemake command path
 * @param path Path to the xcodemake executable
 */
function overrideXcodemakeCommand(path: string): void {
  overriddenXcodemakePath = path;
  log('info', `Using overridden xcodemake path: ${path}`);
}

/**
 * Install xcodemake by downloading it from GitHub
 * @returns Promise resolving to boolean indicating if installation was successful
 */
async function installXcodemake(): Promise<boolean> {
  const tempDir = os.tmpdir();
  const xcodemakeDir = path.join(tempDir, 'xcodebuildmcp');
  const xcodemakePath = path.join(xcodemakeDir, 'xcodemake');

  log('info', `Attempting to install xcodemake to ${xcodemakePath}`);

  try {
    // Create directory if it doesn't exist
    await fs.mkdir(xcodemakeDir, { recursive: true });

    // Download the script
    log('info', 'Downloading xcodemake from GitHub...');
    const response = await fetch(
      'https://raw.githubusercontent.com/cameroncooke/xcodemake/main/xcodemake',
    );

    if (!response.ok) {
      throw new Error(`Failed to download xcodemake: ${response.status} ${response.statusText}`);
    }

    const scriptContent = await response.text();
    await fs.writeFile(xcodemakePath, scriptContent, 'utf8');

    // Make executable
    await fs.chmod(xcodemakePath, 0o755);
    log('info', 'Made xcodemake executable');

    // Override the command to use the direct path
    overrideXcodemakeCommand(xcodemakePath);

    return true;
  } catch (error) {
    log(
      'error',
      `Error installing xcodemake: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Check if xcodemake is installed and available. If enabled but not available, attempts to download it.
 * @returns Promise resolving to boolean indicating if xcodemake is available
 */
export async function isXcodemakeAvailable(): Promise<boolean> {
  // First check if xcodemake is enabled, if not, no need to check or install
  if (!isXcodemakeEnabled()) {
    log('debug', 'xcodemake is not enabled, skipping availability check');
    return false;
  }

  try {
    // Check if we already have an overridden path
    if (overriddenXcodemakePath && existsSync(overriddenXcodemakePath)) {
      log('debug', `xcodemake found at overridden path: ${overriddenXcodemakePath}`);
      return true;
    }

    // Check if xcodemake is available in PATH
    const result = await executeCommand('which xcodemake');
    if (result.success) {
      log('debug', 'xcodemake found in PATH');
      return true;
    }

    // If not found, download and install it
    log('info', 'xcodemake not found in PATH, attempting to download...');
    const installed = await installXcodemake();
    if (installed) {
      log('info', 'xcodemake installed successfully');
      return true;
    } else {
      log('warn', 'xcodemake installation failed');
      return false;
    }
  } catch (error) {
    log(
      'error',
      `Error checking for xcodemake: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Check if a Makefile exists in the current directory
 * @returns boolean indicating if a Makefile exists
 */
export function doesMakefileExist(projectDir: string): boolean {
  return existsSync(`${projectDir}/Makefile`);
}

/**
 * Check if a Makefile log exists in the current directory
 * @param projectDir Directory containing the Makefile
 * @param command Command array to check for log file
 * @returns boolean indicating if a Makefile log exists
 */
export function doesMakeLogFileExist(projectDir: string, command: string[]): boolean {
  // Change to the project directory as xcodemake requires being in the project dir
  const originalDir = process.cwd();

  try {
    process.chdir(projectDir);

    // Filter out any -configuration parameters just like in executeXcodemakeCommand
    const filteredCommand = command.filter((arg, index, array) => {
      // Filter out -configuration and its value
      if (arg === '-configuration' && index < array.length - 1) {
        // Skip this argument and its value
        return false;
      }
      // Also skip the value that follows -configuration
      if (index > 0 && array[index - 1] === '-configuration') {
        return false;
      }
      return true;
    });

    // Construct the expected log filename
    const xcodemakeCommand = ['xcodemake', ...filteredCommand.slice(1)];
    const escapedCommand = xcodemakeCommand.map((arg) => {
      // Remove projectDir from arguments if present at the start
      const prefix = projectDir + '/';
      if (arg.startsWith(prefix)) {
        return arg.substring(prefix.length);
      }
      return arg;
    });
    const commandString = escapedCommand.join(' ');
    const logFileName = `${commandString}.log`;
    log('debug', `Checking for Makefile log: ${logFileName} in directory: ${process.cwd()}`);

    // Read directory contents and check if the file exists
    const files = readdirSync('.');
    const exists = files.includes(logFileName);
    log('debug', `Makefile log ${exists ? 'exists' : 'does not exist'}: ${logFileName}`);
    return exists;
  } catch (error) {
    // Log potential errors like directory not found, permissions issues, etc.
    log(
      'error',
      `Error checking for Makefile log: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  } finally {
    // Always restore the original directory
    process.chdir(originalDir);
  }
}

/**
 * Execute an xcodemake command to generate a Makefile
 * @param buildArgs Build arguments to pass to xcodemake (without the 'xcodebuild' command)
 * @param logPrefix Prefix for logging
 * @returns Promise resolving to command response
 */
export async function executeXcodemakeCommand(
  projectDir: string,
  buildArgs: string[],
  logPrefix: string,
): Promise<XcodeCommandResponse> {
  // Change directory to project directory, this is needed for xcodemake to work
  process.chdir(projectDir);

  // Create the xcodemake command with the build arguments, using potentially overridden path
  // Filter out any -configuration parameters as this is added by xcodemake
  const filteredArgs = buildArgs.filter((arg, index, array) => {
    // Filter out -configuration and its value
    if (arg === '-configuration' && index < array.length - 1) {
      // Skip this argument and its value
      return false;
    }
    // Also skip the value that follows -configuration
    if (index > 0 && array[index - 1] === '-configuration') {
      return false;
    }
    return true;
  });

  const xcodemakeCommand = [getXcodemakeCommand(), ...filteredArgs];

  // Properly escape arguments for shell
  const escapedCommand = xcodemakeCommand.map((arg) => {
    // Remove projectDir from arguments
    arg = arg.replace(projectDir + '/', '');

    // If the argument contains spaces or special characters, wrap it in quotes
    // Ensure existing quotes are escaped
    if (/[\s,"'=]/.test(arg) && !/^".*"$/.test(arg)) {
      // Check if needs quoting and isn't already quoted
      return `"${arg.replace(/(["\\])/g, '\\$1')}"`; // Escape existing quotes and backslashes
    }
    return arg;
  });

  const commandString = escapedCommand.join(' ');
  log('info', `Executing ${logPrefix} command with xcodemake: ${commandString}`);

  return new Promise((resolve, reject) => {
    // Using 'sh -c' to handle complex commands and quoting properly
    const process = spawn('sh', ['-c', commandString], {
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
      const response: XcodeCommandResponse = {
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

/**
 * Execute a make command for incremental builds
 * @param projectDir Directory containing the Makefile
 * @param logPrefix Prefix for logging
 * @returns Promise resolving to command response
 */
export async function executeMakeCommand(
  projectDir: string,
  logPrefix: string,
): Promise<XcodeCommandResponse> {
  const command = `cd "${projectDir}" && make`;
  log('info', `Executing ${logPrefix} command with make: ${command}`);

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
      const response: XcodeCommandResponse = {
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
