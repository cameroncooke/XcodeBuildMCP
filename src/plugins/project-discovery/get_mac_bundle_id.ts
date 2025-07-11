/**
 * Project Discovery Plugin: Get macOS Bundle ID
 *
 * Extracts the bundle identifier from a macOS app bundle (.app).
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { log } from '../../utils/index.js';
import { validateRequiredParam, validateFileExists } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

export default {
  name: 'get_mac_bundle_id',
  description:
    "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
  schema: z.object({
    appPath: z
      .string()
      .describe(
        'Path to the macOS .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  }),
  async handler(args: any): Promise<ToolResponse> {
    const params = args;
    const validated = this.schema.parse(params);

    const appPathValidation = validateRequiredParam('appPath', validated.appPath);
    if (!appPathValidation.isValid) {
      return appPathValidation.errorResponse;
    }

    const appPathExistsValidation = validateFileExists(validated.appPath);
    if (!appPathExistsValidation.isValid) {
      return appPathExistsValidation.errorResponse;
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
        } catch (innerError) {
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
  },
};
