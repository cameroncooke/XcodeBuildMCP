/**
 * Device Project Plugin: Get Device App Path Project
 * 
 * Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a project file.
 * IMPORTANT: Requires projectPath and scheme.
 */

import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { validateRequiredParam, createTextResponse } from '../../src/utils/validation.js';
import { executeCommand } from '../../src/utils/command.js';

const XcodePlatform = {
  iOS: 'iOS',
  watchOS: 'watchOS',
  tvOS: 'tvOS',
  visionOS: 'visionOS',
  iOSSimulator: 'iOS Simulator',
  watchOSSimulator: 'watchOS Simulator',
  tvOSSimulator: 'tvOS Simulator',
  visionOSSimulator: 'visionOS Simulator',
  macOS: 'macOS',
};

export default {
  name: 'get_device_app_path_proj',
  description: 'Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_device_app_path_proj({ projectPath: \'/path/to/project.xcodeproj\', scheme: \'MyScheme\' })',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
    scheme: z.string().describe('The scheme to use'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    platform: z
      .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
      .optional()
      .describe('Target platform (defaults to iOS)'),
  },
  async handler(params) {
    const projectValidation = validateRequiredParam('projectPath', params.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    const platformMap = {
      iOS: XcodePlatform.iOS,
      watchOS: XcodePlatform.watchOS,
      tvOS: XcodePlatform.tvOS,
      visionOS: XcodePlatform.visionOS,
    };

    const platform = platformMap[params.platform ?? 'iOS'];
    const configuration = params.configuration ?? 'Debug';

    log('info', `Getting app path for scheme ${params.scheme} on platform ${platform}`);

    try {
      // Create the command array for xcodebuild with -showBuildSettings option
      const command = ['xcodebuild', '-showBuildSettings'];

      // Add the project
      command.push('-project', params.projectPath);

      // Add the scheme and configuration
      command.push('-scheme', params.scheme);
      command.push('-configuration', configuration);

      // Handle destination based on platform
      let destinationString = '';

      if (platform === XcodePlatform.iOS) {
        destinationString = 'generic/platform=iOS';
      } else if (platform === XcodePlatform.watchOS) {
        destinationString = 'generic/platform=watchOS';
      } else if (platform === XcodePlatform.tvOS) {
        destinationString = 'generic/platform=tvOS';
      } else if (platform === XcodePlatform.visionOS) {
        destinationString = 'generic/platform=visionOS';
      } else {
        return createTextResponse(`Unsupported platform: ${platform}`, true);
      }

      command.push('-destination', destinationString);

      // Execute the command directly
      const result = await executeCommand(command, 'Get App Path');

      if (!result.success) {
        return createTextResponse(`Failed to get app path: ${result.error}`, true);
      }

      if (!result.output) {
        return createTextResponse('Failed to extract build settings output from the result.', true);
      }

      const buildSettingsOutput = result.output;
      const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
      const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

      if (!builtProductsDirMatch || !fullProductNameMatch) {
        return createTextResponse(
          'Failed to extract app path from build settings. Make sure the app has been built first.',
          true,
        );
      }

      const builtProductsDir = builtProductsDirMatch[1].trim();
      const fullProductName = fullProductNameMatch[1].trim();
      const appPath = `${builtProductsDir}/${fullProductName}`;

      const nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "${appPath}" })
3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })`;

      return {
        content: [
          {
            type: 'text',
            text: `✅ App path retrieved successfully: ${appPath}`,
          },
          {
            type: 'text',
            text: nextStepsText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error retrieving app path: ${errorMessage}`);
      return createTextResponse(`Error retrieving app path: ${errorMessage}`, true);
    }
  },
};