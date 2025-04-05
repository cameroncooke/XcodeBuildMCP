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


import { v4 as uuidv4 } from 'uuid';
import { ToolProgressUpdate } from '../types/common.js';

/**
 * Function type for progress updates
 */
export type ProgressCallback = (update: ToolProgressUpdate) => void;

/**
 * Execute an xcodebuild command with optional progress reporting
 * @param command Command array to execute
 * @param logPrefix Prefix for logging
 * @param progressCallback Optional callback for progress updates
 * @returns Promise resolving to command response
 */
export async function executeXcodeCommand(
  command: string[],
  logPrefix: string,
  progressCallback?: ProgressCallback
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

  // Create unique operation ID for this command execution
  const operationId = uuidv4();
  
  // Set up progress tracking
  let lastProgressUpdate = 0;
  const progressUpdateInterval = 1000; // Update interval in ms
  let lastProgressMessage = '';
  
  // Initial progress update if callback provided
  if (progressCallback) {
    progressCallback({
      operationId,
      status: 'running',
      progress: 0,
      message: `Starting ${logPrefix}...`,
      timestamp: new Date().toISOString(),
    });
  }

  return new Promise((resolve) => {
    // Using 'sh -c' to handle complex commands and quoting properly
    const process = spawn('sh', ['-c', commandString], {
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, pipe stdout/stderr
      // Consider setting a working directory if paths are relative
      // cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';
    
    // Track build phase and progress heuristics
    let currentPhase = '';
    const buildPhases = ['CompileC', 'CompileSwift', 'Linking', 'CodeSign'];
    let totalFiles = 0;
    let processedFiles = 0;
    let estimatedProgress = 0;

    // Function to send progress updates
    const sendProgressUpdate = (message: string, forceSend = false) => {
      const now = Date.now();
      // Only send updates if forced or after interval has passed
      if (progressCallback && (forceSend || now - lastProgressUpdate > progressUpdateInterval)) {
        lastProgressUpdate = now;
        lastProgressMessage = message;
        
        progressCallback({
          operationId,
          status: 'running',
          progress: estimatedProgress,
          message,
          timestamp: new Date().toISOString(),
          details: `Phase: ${currentPhase || 'Preparing'}`
        });
      }
    };

    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Progress reporting based on output analysis
      if (progressCallback) {
        // Look for common xcodebuild output patterns to estimate progress
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          // Detect compilation phase
          for (const phase of buildPhases) {
            if (line.includes(phase)) {
              if (currentPhase !== phase) {
                currentPhase = phase;
                // Phase transition resets counters
                const phaseIndex = buildPhases.indexOf(phase);
                // Base progress on phase (rough estimate)
                estimatedProgress = Math.min(Math.floor(25 * phaseIndex), 90);
                sendProgressUpdate(`${phase} phase...`, true);
              }
              
              // Count files for compilation phases
              if (phase === 'CompileC' || phase === 'CompileSwift') {
                processedFiles++;
                if (totalFiles > 0) {
                  // Adjust progress within the phase
                  const phaseProgress = Math.min(Math.floor((processedFiles / totalFiles) * 100), 100);
                  estimatedProgress = Math.min(estimatedProgress + phaseProgress / 4, 95);
                }
              }
              
              sendProgressUpdate(`Processing: ${line.substring(0, 80)}...`);
              break;
            }
          }
          
          // Look for "x of y files" patterns
          const fileCountMatch = line.match(/(\d+) of (\d+) files/);
          if (fileCountMatch && fileCountMatch.length >= 3) {
            processedFiles = parseInt(fileCountMatch[1], 10);
            totalFiles = parseInt(fileCountMatch[2], 10);
            if (totalFiles > 0) {
              // Update progress based on file counts
              estimatedProgress = Math.min(Math.floor((processedFiles / totalFiles) * 90), 95);
              sendProgressUpdate(`Processing file ${processedFiles} of ${totalFiles}`, true);
            }
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Log stderr chunks immediately
      log('warning', `stderr chunk: ${chunk.trim()}`);
      
      // Send error info in progress updates
      if (progressCallback) {
        sendProgressUpdate(`Warning: ${chunk.substring(0, 100)}...`, true);
      }
    });

    process.on('close', (exitCode) => {
      const success = exitCode === 0;

      log('info', `${logPrefix} process completed with exit code: ${exitCode}`);

      // Final progress update on completion
      if (progressCallback) {
        progressCallback({
          operationId,
          status: success ? 'completed' : 'failed',
          progress: success ? 100 : estimatedProgress,
          message: success 
            ? `${logPrefix} completed successfully` 
            : `${logPrefix} failed with exit code ${exitCode}`,
          timestamp: new Date().toISOString(),
          details: success ? undefined : stderr.substring(0, 500)
        });
      }

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
        
        // Process error progress update
        if (progressCallback) {
          progressCallback({
            operationId,
            status: 'failed',
            progress: 0,
            message: `Failed to start ${logPrefix} process: ${err.message}`,
            timestamp: new Date().toISOString()
          });
        }
        
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
