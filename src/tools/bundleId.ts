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
 * Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.
 */
export function registerGetMacOSBundleIdTool(server: McpServer): void {
  server.tool(
    'get_mac_bundle_id',
    "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
    {
      appPath: z
        .string()
        .describe(
          'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
        ),
    },
    async (params): Promise<ToolResponse> => {
      const appPathValidation = validateRequiredParam('appPath', params.appPath);
      if (!appPathValidation.isValid) {
        return appPathValidation.errorResponse!;
      }

      const appPathExistsValidation = validateFileExists(params.appPath);
      if (!appPathExistsValidation.isValid) {
        return appPathExistsValidation.errorResponse!;
      }

      log('info', `Starting bundle ID extraction for macOS app: ${params.appPath}`);

      try {
        let bundleId;

        try {
          bundleId = execSync(`defaults read "${params.appPath}/Contents/Info" CFBundleIdentifier`)
            .toString()
            .trim();
        } catch {
          try {
            bundleId = execSync(
              `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${params.appPath}/Contents/Info.plist"`,
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
- Launch the app: launch_macos_app({ appPath: "${params.appPath}" })`,
            },
          ],
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
        };
      }
    },
  );
}

/**
 * Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })
 */
export function registerGetAppBundleIdTool(server: McpServer): void {
  server.tool(
    'get_app_bundle_id',
    "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
    {
      appPath: z
        .string()
        .describe(
          'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
        ),
    },
    async (params): Promise<ToolResponse> => {
      const appPathValidation = validateRequiredParam('appPath', params.appPath);
      if (!appPathValidation.isValid) {
        return appPathValidation.errorResponse!;
      }

      const appPathExistsValidation = validateFileExists(params.appPath);
      if (!appPathExistsValidation.isValid) {
        return appPathExistsValidation.errorResponse!;
      }

      log('info', `Starting bundle ID extraction for app: ${params.appPath}`);

      try {
        let bundleId;

        try {
          bundleId = execSync(`defaults read "${params.appPath}/Info" CFBundleIdentifier`)
            .toString()
            .trim();
        } catch {
          try {
            bundleId = execSync(
              `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${params.appPath}/Info.plist"`,
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
- Install in simulator: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${params.appPath}" })
- Launch in simulator: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "${bundleId}" })
- Or install on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${params.appPath}" })
- Or launch on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "${bundleId}" })`,
            },
          ],
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
        };
      }
    },
  );
}
