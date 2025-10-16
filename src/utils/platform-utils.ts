import { XcodePlatform } from '../types/common.ts';

/**
 * Maps platform string to XcodePlatform enum.
 * Handles both device and simulator platform strings.
 * Defaults to iOS Simulator if platform is undefined or unknown.
 *
 * @param platformStr - Platform string from tool parameters (e.g., "iOS Simulator", "visionOS", "watchOS Simulator")
 * @returns XcodePlatform enum value
 *
 * @example
 * const platform = mapPlatformStringToEnum('visionOS Simulator');
 * // Returns: XcodePlatform.visionOSSimulator
 *
 * @example
 * const platform = mapPlatformStringToEnum('visionOS');
 * // Returns: XcodePlatform.visionOS
 */
export function mapPlatformStringToEnum(platformStr?: string): XcodePlatform {
  const platformMap: Record<string, XcodePlatform> = {
    // Simulator platforms
    'iOS Simulator': XcodePlatform.iOSSimulator,
    'watchOS Simulator': XcodePlatform.watchOSSimulator,
    'tvOS Simulator': XcodePlatform.tvOSSimulator,
    'visionOS Simulator': XcodePlatform.visionOSSimulator,
    // Device platforms
    iOS: XcodePlatform.iOS,
    watchOS: XcodePlatform.watchOS,
    tvOS: XcodePlatform.tvOS,
    visionOS: XcodePlatform.visionOS,
    macOS: XcodePlatform.macOS,
  };
  return platformMap[platformStr ?? 'iOS Simulator'] ?? XcodePlatform.iOSSimulator;
}
