/**
 * Device Shared Plugin: Get Device App Path (Unified)
 *
 * Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using either a project or workspace.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { ToolResponse, XcodePlatform } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Unified schema: XOR between projectPath and workspacePath, sharing common options
const baseOptions = {
  scheme: z.string().describe('The scheme to use'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  platform: z
    .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
    .optional()
    .describe('Target platform (defaults to iOS)'),
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const getDeviceAppPathSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

// Use z.infer for type safety
type GetDeviceAppPathParams = z.infer<typeof getDeviceAppPathSchema>;

export async function get_device_app_pathLogic(
  params: GetDeviceAppPathParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
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

    // Add the project or workspace
    if (params.projectPath) {
      command.push('-project', params.projectPath);
    } else if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else {
      // This should never happen due to schema validation
      throw new Error('Either projectPath or workspacePath is required.');
    }

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
    const result = await executor(command, 'Get App Path', true);

    if (!result.success) {
      return createTextResponse(`Failed to get app path: ${result.error}`, true);
    }

    if (!result.output) {
      return createTextResponse('Failed to extract build settings output from the result.', true);
    }

    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/^\s*BUILT_PRODUCTS_DIR\s*=\s*(.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/^\s*FULL_PRODUCT_NAME\s*=\s*(.+)$/m);

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
}

export default {
  name: 'get_device_app_path',
  description:
    "Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using either a project or workspace. Provide exactly one of projectPath or workspacePath. Example: get_device_app_path({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<GetDeviceAppPathParams>(
    getDeviceAppPathSchema as z.ZodType<GetDeviceAppPathParams>,
    get_device_app_pathLogic,
    getDefaultCommandExecutor,
  ),
};
