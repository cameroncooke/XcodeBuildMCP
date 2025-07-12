/**
 * Project Discovery Plugin: Get App Bundle ID
 *
 * Extracts the bundle identifier from an app bundle (.app) for any Apple platform
 * (iOS, iPadOS, watchOS, tvOS, visionOS).
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { log } from '../../utils/index.js';
import { validateRequiredParam, validateFileExists } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

export default {
  name: 'get_app_bundle_id',
  description:
    "Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS). IMPORTANT: You MUST provide the appPath parameter. Example: get_app_bundle_id({ appPath: '/path/to/your/app.app' })",
  schema: z.object({
    appPath: z
      .string()
      .describe(
        'Path to the .app bundle to extract bundle ID from (full path to the .app directory)',
      ),
  }),
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const params = args;
    // Parse params with schema for validation
    const validated = this.schema.parse(params);

    const appPathValidation = validateRequiredParam('appPath', validated.appPath);
    if (!appPathValidation.isValid) {
      return appPathValidation.errorResponse;
    }

    const appPathExistsValidation = validateFileExists(validated.appPath);
    if (!appPathExistsValidation.isValid) {
      return appPathExistsValidation.errorResponse;
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
        } catch (innerError) {
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
  },
};
