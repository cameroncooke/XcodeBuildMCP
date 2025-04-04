/**
 * Xcode Utilities - Common functions for working with Xcode tools
 */

import { spawn } from 'child_process';
import { log } from './logger.js';

export interface XcodeCommandResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Platform options for Xcode builds
 */
export enum XcodePlatform {
  macOS = 'macOS',
  iOS = 'iOS',
  iOSSimulator = 'iOS Simulator',
  watchOS = 'watchOS',
  watchOSSimulator = 'watchOS Simulator',
  tvOS = 'tvOS',
  tvOSSimulator = 'tvOS Simulator',
  visionOS = 'visionOS',
  visionOSSimulator = 'visionOS Simulator',
}

/**
 * Type definition for common Xcode parameters used across tools.
 */
export interface XcodeParams {
  workspacePath?: string;
  projectPath?: string;
  scheme?: string;
  configuration?: string;
  derivedDataPath?: string;
  platform?: XcodePlatform; // Added platform here
  destination?: string; // Explicit destination can override platform logic
  simulatorName?: string;
  simulatorId?: string;
  useLatestOS?: boolean;
  extraArgs?: string[];
  [key: string]: unknown; // Allow other properties if needed
}


export async function executeXcodeCommand(
  command: string[],
  logPrefix: string,
): Promise<XcodeCommandResponse> {
  // Properly escape arguments for shell
  const escapedCommand = command.map((arg) => {
    // If the argument contains spaces or special characters, wrap it in quotes
    // Ensure existing quotes are escaped
    if (/[\s,"'=]/.test(arg) && !/^".*"$/.test(arg)) { // Check if needs quoting and isn't already quoted
        return `"${arg.replace(/(["\\])/g, '\\$1')}"`; // Escape existing quotes and backslashes
      }
    return arg;
  });

  const commandString = escapedCommand.join(' ');
  log('info', `Executing ${logPrefix} command: ${commandString}`);
  log('debug', `DEBUG - Raw command array: ${JSON.stringify(command)}`);

  return new Promise((resolve) => {
    // Using 'sh -c' to handle complex commands and quoting properly
    const process = spawn('sh', ['-c', commandString], {
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, pipe stdout/stderr
      // Consider setting a working directory if paths are relative
      // cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Log chunks for debugging large output
      // log('debug', `stdout chunk: ${chunk.length} bytes`);
    });

    process.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Log stderr chunks immediately
       log('warning', `stderr chunk: ${chunk.trim()}`);
    });

    process.on('close', (exitCode) => {
      const success = exitCode === 0;

      log('info', `${logPrefix} process completed with exit code: ${exitCode}`);

      if (success) {
        log('info', `${logPrefix} operation successful`);
        resolve({
          success: true,
          output: stdout || `${logPrefix} operation completed successfully`, // Ensure some output on success
        });
      } else {
        log('error', `${logPrefix} operation failed with exit code ${exitCode}`);
        resolve({
          success: false,
          output: stdout, // Include stdout even on failure
          error: stderr || `Operation failed with exit code ${exitCode}. No stderr output.`, // Provide more info
        });
      }
    });

    process.on('error', (err) => {
        log('error', `${logPrefix} failed to start process: ${err.message}`);
        resolve({
            success: false,
            output: stdout,
            error: `Failed to start process: ${err.message}`,
        });
    });
  });
}

/**
 * Adds common Xcode parameters to a command array.
 * Uses the XcodeParams type for better structure.
 */
export function addXcodeParameters(
  command: string[],
  params: XcodeParams,
  logPrefix: string,
): void {
  if (params.workspacePath) {
    command.push('-workspace', params.workspacePath);
    log('info', `${logPrefix}: Using workspace ${params.workspacePath}`);
  } else if (params.projectPath) { // Use else if to avoid adding both if provided
    command.push('-project', params.projectPath);
    log('info', `${logPrefix}: Using project ${params.projectPath}`);
  } else {
    // Only log warning if neither is provided, as some tools might work implicitly
    log('info', `${logPrefix}: No workspace or project path specified, using implicit.`);
  }


  if (params.scheme) {
    command.push('-scheme', params.scheme);
    log('info', `${logPrefix}: Using scheme ${params.scheme}`);
  }

  if (params.configuration) {
    command.push('-configuration', params.configuration);
    log('info', `${logPrefix}: Using configuration ${params.configuration}`);
  }

  if (params.derivedDataPath) {
    command.push('-derivedDataPath', params.derivedDataPath);
    log('info', `${logPrefix}: Using derived data path ${params.derivedDataPath}`);
  }

  // Handle destination construction - prioritize explicit destination if provided
  if (params.destination) {
      command.push('-destination', params.destination);
      log('info', `${logPrefix}: Using explicit destination ${params.destination}`);
  } else if (params.platform) {
    try {
      const destination = constructDestinationString(
        params.platform,
        params.simulatorName,
        params.simulatorId,
        params.useLatestOS ?? true, // Default to true if undefined
      );

      command.push('-destination', destination);
      log('info', `${logPrefix}: Using constructed destination ${destination}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `${logPrefix}: Error constructing destination: ${errorMessage}`);
      // Don't add a destination if construction fails, let xcodebuild use defaults or fail
       log('warning', `${logPrefix}: Proceeding without explicit -destination parameter due to error.`);
    }
  }

  if (params.extraArgs && params.extraArgs.length > 0) {
    command.push(...params.extraArgs);
    log('info', `${logPrefix}: Adding extra arguments: ${params.extraArgs.join(' ')}`);
  }
}


/**
 * Constructs a destination string for xcodebuild from platform and simulator parameters
 * @param platform The target platform
 * @param simulatorName Optional simulator name
 * @param simulatorId Optional simulator UUID
 * @param useLatest Whether to use the latest simulator version (primarily for named simulators)
 * @returns Properly formatted destination string for xcodebuild
 */
export function constructDestinationString(
  platform: XcodePlatform,
  simulatorName?: string,
  simulatorId?: string,
  useLatest: boolean = true,
): string {
  const isSimulatorPlatform = [
    XcodePlatform.iOSSimulator,
    XcodePlatform.watchOSSimulator,
    XcodePlatform.tvOSSimulator,
    XcodePlatform.visionOSSimulator,
  ].includes(platform);

  // If ID is provided for a simulator, it takes precedence and uniquely identifies it.
  if (isSimulatorPlatform && simulatorId) {
    return `platform=${platform},id=${simulatorId}`;
  }

  // If name is provided for a simulator
  if (isSimulatorPlatform && simulatorName) {
    return `platform=${platform},name=${simulatorName}${useLatest ? ',OS=latest' : ''}`;
  }

  // If it's a simulator platform but neither ID nor name is provided (should be prevented by callers now)
   if (isSimulatorPlatform && !simulatorId && !simulatorName) {
     // Throw error as specific simulator is needed unless it's a generic build action
     // Allow fallback for generic simulator builds if needed, but generally require specifics for build/run
     log('warning', `Constructing generic destination for ${platform} without name or ID. This might not be specific enough.`);
     // Example: return `platform=${platform},name=Any ${platform} Device`; // Or similar generic target
     throw new Error(`Simulator name or ID is required for specific ${platform} operations`);
   }


  // Handle non-simulator platforms
  switch (platform) {
    case XcodePlatform.macOS:
      return 'platform=macOS,arch=arm64,arch=x86_64'; // Specify arch for universal binary
    case XcodePlatform.iOS:
      return 'generic/platform=iOS';
    case XcodePlatform.watchOS:
      return 'generic/platform=watchOS';
    case XcodePlatform.tvOS:
      return 'generic/platform=tvOS';
    case XcodePlatform.visionOS:
      return 'generic/platform=visionOS';
    // No default needed as enum covers all cases unless extended
    // default:
    //   throw new Error(`Unsupported platform for destination string: ${platform}`);
  }
    // Fallback just in case (shouldn't be reached with enum)
    log('error', `Reached unexpected point in constructDestinationString for platform: ${platform}`);
    return `platform=${platform}`;
}