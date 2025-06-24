/**
 * Bundle ID Tools - Extract bundle identifiers from app bundles
 *
 * This module provides tools for extracting bundle identifiers from iOS and macOS
 * application bundles (.app directories). Bundle IDs are required for launching
 * and installing applications.
 *
 * Responsibilities:
 * - Extracting bundle IDs from macOS app bundles
 * - Extracting bundle IDs from iOS app bundles
 * - Validating app bundle paths
 * - Providing formatted responses with next steps
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateRequiredParam, validateFileExists } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { execSync } from 'child_process';

/**
 * Schema for get_mac_bundle_id tool parameters
 */
export const GetMacOSBundleIdSchema = z.object({
  appPath: z
    .string()
    .describe(
      'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
    ),
});

/**
 * Schema for get_app_bundle_id tool parameters
 */
export const GetAppBundleIdSchema = z.object({
  appPath: z
    .string()
    .describe(
      'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
    ),
});

/**
 * Extracts bundle ID from a macOS app bundle
 */
export async function getMacOSBundleId(
  params: z.infer<typeof GetMacOSBundleIdSchema>,
): Promise<ToolResponse> {
  const validated = GetMacOSBundleIdSchema.parse(params);

  const appPathValidation = validateRequiredParam('appPath', validated.appPath);
  if (!appPathValidation.isValid) {
    return appPathValidation.errorResponse!;
  }

  const appPathExistsValidation = validateFileExists(validated.appPath);
  if (!appPathExistsValidation.isValid) {
    return appPathExistsValidation.errorResponse!;
  }

  log('info', `Starting bundle ID extraction for macOS app: ${validated.appPath}`);

  try {
    let bundleId;

    try {
      bundleId = execSync(`defaults read "${validated.appPath}/Contents/Info" CFBundleIdentifier`)
        .toString()
        .trim();
    } catch {
      try {
        bundleId = execSync(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${validated.appPath}/Contents/Info.plist"`,
        )
          .toString()
          .trim();
      } catch (innerError: unknown) {
        throw new Error(
          `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
        );
      }
    }

    log('info', `Extracted macOS bundle ID: ${bundleId}`);

    return {
      content: [
        {
          type: 'text',
          text: ` Bundle ID for macOS app: ${bundleId}`,
        },
        {
          type: 'text',
          text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "${validated.appPath}" })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error extracting macOS bundle ID: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error extracting macOS bundle ID: ${errorMessage}`,
        },
        {
          type: 'text',
          text: `Make sure the path points to a valid macOS app bundle (.app directory).`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Extracts bundle ID from an app bundle for any Apple platform
 */
export async function getAppBundleId(
  params: z.infer<typeof GetAppBundleIdSchema>,
): Promise<ToolResponse> {
  const validated = GetAppBundleIdSchema.parse(params);

  const appPathValidation = validateRequiredParam('appPath', validated.appPath);
  if (!appPathValidation.isValid) {
    return appPathValidation.errorResponse!;
  }

  const appPathExistsValidation = validateFileExists(validated.appPath);
  if (!appPathExistsValidation.isValid) {
    return appPathExistsValidation.errorResponse!;
  }

  log('info', `Starting bundle ID extraction for app: ${validated.appPath}`);

  try {
    let bundleId;

    try {
      bundleId = execSync(`defaults read "${validated.appPath}/Info" CFBundleIdentifier`)
        .toString()
        .trim();
    } catch {
      try {
        bundleId = execSync(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${validated.appPath}/Info.plist"`,
        )
          .toString()
          .trim();
      } catch (innerError: unknown) {
        throw new Error(
          `Could not extract bundle ID from Info.plist: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
        );
      }
    }

    log('info', `Extracted app bundle ID: ${bundleId}`);

    return {
      content: [
        {
          type: 'text',
          text: ` Bundle ID: ${bundleId}`,
        },
        {
          type: 'text',
          text: `Next Steps:
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${validated.appPath}" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "${bundleId}" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${validated.appPath}" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "${bundleId}" })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error extracting app bundle ID: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error extracting app bundle ID: ${errorMessage}`,
        },
        {
          type: 'text',
          text: `Make sure the path points to a valid app bundle (.app directory).`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.
 */
export function registerGetMacOSBundleIdTool(server: McpServer): void {
  server.tool(
    'get_mac_bundle_id',
    "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
    GetMacOSBundleIdSchema.shape,
    getMacOSBundleId,
  );
}

/**
 * Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })
 */
export function registerGetAppBundleIdTool(server: McpServer): void {
  server.tool(
    'get_app_bundle_id',
    "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
    GetAppBundleIdSchema.shape,
    getAppBundleId,
  );
}
