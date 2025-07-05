/**
 * macOS Workspace Plugin: Get macOS App Path Workspace
 *
 * Gets the app bundle path for a macOS application using a workspace.
 * IMPORTANT: Requires workspacePath and scheme.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';

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
  name: 'get_mac_app_path_ws',
  description:
    "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    arch: z
      .enum(['arm64', 'x86_64'])
      .optional()
      .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    const configuration = params.configuration ?? 'Debug';

    log('info', `Getting app path for scheme ${params.scheme} on platform ${XcodePlatform.macOS}`);

    try {
      // Create the command array for xcodebuild with -showBuildSettings option
      const command = ['xcodebuild', '-showBuildSettings'];

      // Add the workspace
      command.push('-workspace', params.workspacePath);

      // Add the scheme and configuration
      command.push('-scheme', params.scheme);
      command.push('-configuration', configuration);

      // Handle destination for macOS
      let destinationString = 'platform=macOS';
      if (params.arch) {
        destinationString += `,arch=${params.arch}`;
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
1. Get bundle ID: get_macos_bundle_id({ appPath: "${appPath}" })
2. Launch the app: launch_macos_app({ appPath: "${appPath}" })`;

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
