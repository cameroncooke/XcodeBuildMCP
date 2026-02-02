/**
 * Platform Detection Utility
 *
 * Detects the target platform for a scheme by querying xcodebuild build settings.
 * This allows build tools to automatically select the correct simulator type
 * (iOS vs watchOS vs tvOS vs visionOS) based on what the scheme actually targets.
 */

import { XcodePlatform } from '../types/common.ts';
import { log } from './logging/index.ts';
import type { CommandExecutor } from './execution/index.ts';
import { getDefaultCommandExecutor } from './execution/index.ts';

export interface PlatformDetectionResult {
  platform: XcodePlatform | null;
  sdkroot: string | null;
  supportedPlatforms: string[];
  error?: string;
}

/**
 * Maps SDKROOT values to XcodePlatform enum values for simulator builds.
 */
function sdkrootToSimulatorPlatform(sdkroot: string): XcodePlatform | null {
  const sdkLower = sdkroot.toLowerCase();

  if (sdkLower.includes('watchsimulator') || sdkLower.includes('watchos')) {
    return XcodePlatform.watchOSSimulator;
  }
  if (sdkLower.includes('appletvsimulator') || sdkLower.includes('tvos')) {
    return XcodePlatform.tvOSSimulator;
  }
  if (sdkLower.includes('xrsimulator') || sdkLower.includes('visionos')) {
    return XcodePlatform.visionOSSimulator;
  }
  if (
    sdkLower.includes('iphonesimulator') ||
    sdkLower.includes('iphoneos') ||
    sdkLower.includes('ios')
  ) {
    return XcodePlatform.iOSSimulator;
  }
  if (sdkLower.includes('macos') || sdkLower.includes('macosx')) {
    return XcodePlatform.macOS;
  }

  return null;
}

/**
 * Maps SUPPORTED_PLATFORMS values to determine the primary simulator platform.
 */
function supportedPlatformsToSimulatorPlatform(platforms: string[]): XcodePlatform | null {
  // Check in order of specificity
  for (const platform of platforms) {
    const platformLower = platform.toLowerCase();

    if (platformLower.includes('watchsimulator') || platformLower.includes('watchos')) {
      return XcodePlatform.watchOSSimulator;
    }
    if (platformLower.includes('appletvsimulator') || platformLower.includes('tvos')) {
      return XcodePlatform.tvOSSimulator;
    }
    if (platformLower.includes('xrsimulator') || platformLower.includes('visionos')) {
      return XcodePlatform.visionOSSimulator;
    }
  }

  // Check for iOS after more specific platforms
  for (const platform of platforms) {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('iphonesimulator') || platformLower.includes('iphoneos')) {
      return XcodePlatform.iOSSimulator;
    }
  }

  // Check for macOS
  for (const platform of platforms) {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('macos') || platformLower.includes('macosx')) {
      return XcodePlatform.macOS;
    }
  }

  return null;
}

/**
 * Detects the target platform for a given scheme by querying xcodebuild.
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
      log('warning', `[Platform Detection] Failed to query build settings: ${result.error}`);
      return {
        platform: null,
        sdkroot: null,
        supportedPlatforms: [],
        error: result.error,
      };
    }

    const output = result.output || '';

    // Parse SDKROOT
    const sdkrootMatch = output.match(/^\s*SDKROOT\s*=\s*(.+)$/m);
    const sdkroot = sdkrootMatch ? sdkrootMatch[1].trim() : null;

    // Parse SUPPORTED_PLATFORMS
    const supportedPlatformsMatch = output.match(/^\s*SUPPORTED_PLATFORMS\s*=\s*(.+)$/m);
    const supportedPlatforms = supportedPlatformsMatch
      ? supportedPlatformsMatch[1].trim().split(/\s+/)
      : [];

    // Determine platform from SDKROOT first, then fall back to SUPPORTED_PLATFORMS
    let platform: XcodePlatform | null = null;

    if (sdkroot) {
      platform = sdkrootToSimulatorPlatform(sdkroot);
      if (platform) {
        log('info', `[Platform Detection] Detected platform from SDKROOT: ${platform}`);
      }
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

/**
 * Returns true if the platform requires a watchOS simulator.
 */
export function isWatchOSPlatform(platform: XcodePlatform): boolean {
  return platform === XcodePlatform.watchOS || platform === XcodePlatform.watchOSSimulator;
}

/**
 * Returns the simulator platform variant for a given platform.
 * E.g., watchOS -> watchOS Simulator, iOS -> iOS Simulator
 */
export function getSimulatorPlatform(platform: XcodePlatform): XcodePlatform {
  switch (platform) {
    case XcodePlatform.iOS:
      return XcodePlatform.iOSSimulator;
    case XcodePlatform.watchOS:
      return XcodePlatform.watchOSSimulator;
    case XcodePlatform.tvOS:
      return XcodePlatform.tvOSSimulator;
    case XcodePlatform.visionOS:
      return XcodePlatform.visionOSSimulator;
    default:
      return platform; // Already a simulator or macOS
  }
}
