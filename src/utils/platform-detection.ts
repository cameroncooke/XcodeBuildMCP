/**
 * Platform Detection Utility
 *
 * Detects the simulator platform for a scheme by querying xcodebuild build settings.
 * This allows build tools to automatically select the correct simulator type
 * (iOS vs watchOS vs tvOS vs visionOS) based on what the scheme actually targets.
 */

import { XcodePlatform } from '../types/common.ts';
import { log } from './logging/index.ts';
import type { CommandExecutor } from './execution/index.ts';
import { getDefaultCommandExecutor } from './execution/index.ts';

export type SimulatorPlatform =
  | XcodePlatform.iOSSimulator
  | XcodePlatform.watchOSSimulator
  | XcodePlatform.tvOSSimulator
  | XcodePlatform.visionOSSimulator;

export interface PlatformDetectionResult {
  platform: SimulatorPlatform | null;
  sdkroot: string | null;
  supportedPlatforms: string[];
  error?: string;
}

/**
 * Maps SDKROOT values to simulator platform enum values.
 */
function sdkrootToSimulatorPlatform(sdkroot: string): SimulatorPlatform | null {
  const sdkLower = sdkroot.toLowerCase();

  if (sdkLower.startsWith('watchsimulator')) {
    return XcodePlatform.watchOSSimulator;
  }
  if (sdkLower.startsWith('appletvsimulator')) {
    return XcodePlatform.tvOSSimulator;
  }
  if (sdkLower.startsWith('xrsimulator')) {
    return XcodePlatform.visionOSSimulator;
  }
  if (sdkLower.startsWith('iphonesimulator')) {
    return XcodePlatform.iOSSimulator;
  }

  return null;
}

/**
 * Maps SUPPORTED_PLATFORMS values to determine the primary simulator platform.
 */
function supportedPlatformsToSimulatorPlatform(platforms: string[]): SimulatorPlatform | null {
  const normalizedPlatforms = new Set(platforms.map((platform) => platform.toLowerCase()));

  // Check in order of specificity
  if (normalizedPlatforms.has('watchsimulator')) {
    return XcodePlatform.watchOSSimulator;
  }
  if (normalizedPlatforms.has('appletvsimulator')) {
    return XcodePlatform.tvOSSimulator;
  }
  if (normalizedPlatforms.has('xrsimulator')) {
    return XcodePlatform.visionOSSimulator;
  }

  // Check for iOS after more specific platforms
  if (normalizedPlatforms.has('iphonesimulator')) {
    return XcodePlatform.iOSSimulator;
  }

  return null;
}

function extractBuildSettingValues(output: string, settingName: string): string[] {
  const regex = new RegExp(`^\\s*${settingName}\\s*=\\s*(.+)$`, 'gm');
  const values: string[] = [];

  for (const match of output.matchAll(regex)) {
    const value = match[1]?.trim();
    if (value) {
      values.push(value);
    }
  }

  return values;
}

/**
 * Detects the simulator platform for a given scheme by querying xcodebuild.
 *
 * @param projectPath - Path to the .xcodeproj file (mutually exclusive with workspacePath)
 * @param workspacePath - Path to the .xcworkspace file (mutually exclusive with projectPath)
 * @param scheme - The scheme name to query
 * @param executor - Command executor (defaults to standard executor)
 * @returns PlatformDetectionResult with the detected platform or error
 */
export async function detectPlatformFromScheme(
  projectPath: string | undefined,
  workspacePath: string | undefined,
  scheme: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<PlatformDetectionResult> {
  const command = ['xcodebuild', '-showBuildSettings', '-scheme', scheme];

  if (projectPath && workspacePath) {
    return {
      platform: null,
      sdkroot: null,
      supportedPlatforms: [],
      error: 'projectPath and workspacePath are mutually exclusive for platform detection',
    };
  }

  if (projectPath) {
    command.push('-project', projectPath);
  } else if (workspacePath) {
    command.push('-workspace', workspacePath);
  } else {
    return {
      platform: null,
      sdkroot: null,
      supportedPlatforms: [],
      error: 'Either projectPath or workspacePath is required for platform detection',
    };
  }

  try {
    log('info', `[Platform Detection] Querying build settings for scheme: ${scheme}`);
    const result = await executor(command, 'Platform Detection', true);

    if (!result.success) {
      const errorMessage = result.error ?? 'xcodebuild -showBuildSettings failed';
      log('warning', `[Platform Detection] Failed to query build settings: ${result.error}`);
      return {
        platform: null,
        sdkroot: null,
        supportedPlatforms: [],
        error: errorMessage,
      };
    }

    const output = result.output || '';

    // Parse all SDKROOT values and prefer the first simulator-compatible one
    const sdkroots = extractBuildSettingValues(output, 'SDKROOT');
    let sdkroot: string | null = null;

    // Parse all SUPPORTED_PLATFORMS values and flatten into one list
    const supportedPlatforms = extractBuildSettingValues(output, 'SUPPORTED_PLATFORMS').flatMap(
      (value) => value.split(/\s+/),
    );

    // Determine platform from SDKROOT first, then fall back to SUPPORTED_PLATFORMS
    let platform: SimulatorPlatform | null = null;

    for (const sdkrootValue of sdkroots) {
      const detectedPlatform = sdkrootToSimulatorPlatform(sdkrootValue);
      if (detectedPlatform) {
        platform = detectedPlatform;
        sdkroot = sdkrootValue;
        break;
      }
    }

    if (!sdkroot && sdkroots.length > 0) {
      sdkroot = sdkroots[0];
    }

    if (platform) {
      log('info', `[Platform Detection] Detected platform from SDKROOT: ${platform}`);
    }

    if (!platform && supportedPlatforms.length > 0) {
      platform = supportedPlatformsToSimulatorPlatform(supportedPlatforms);
      if (platform) {
        log('info', `[Platform Detection] Detected platform from SUPPORTED_PLATFORMS: ${platform}`);
      }
    }

    if (!platform) {
      log('warning', `[Platform Detection] Could not determine platform from build settings`);
    }

    return {
      platform,
      sdkroot,
      supportedPlatforms,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `[Platform Detection] Error: ${errorMessage}`);
    return {
      platform: null,
      sdkroot: null,
      supportedPlatforms: [],
      error: errorMessage,
    };
  }
}
