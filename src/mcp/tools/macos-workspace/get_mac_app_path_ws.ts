/**
 * macOS Workspace Plugin: Get macOS App Path Workspace
 *
 * Gets the app bundle path for a macOS application using a workspace.
 * IMPORTANT: Requires workspacePath and scheme.
 */

import { z } from 'zod';
import { log, createTextResponse } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const getMacAppPathWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
});

// Use z.infer for type safety
type GetMacAppPathWsParams = z.infer<typeof getMacAppPathWsSchema>;

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

export async function get_mac_app_path_wsLogic(
  params: GetMacAppPathWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
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
    const result = await executor(command, 'Get App Path', true, undefined);

    if (!result.success) {
      return createTextResponse(`Error retrieving app path: ${result.error}`, true);
    }

    if (!result.output) {
      return createTextResponse('Failed to extract build settings output from the result.', true);
    }

    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return createTextResponse(
        'Error retrieving app path: Could not extract app path from build settings',
        true,
      );
    }

    const builtProductsDir = builtProductsDirMatch[1].trim();
    const fullProductName = fullProductNameMatch[1].trim();
    const appPath = `${builtProductsDir}/${fullProductName}`;

    const nextStepsText = `Next Steps:
1. Get bundle ID: get_app_bundle_id({ appPath: "${appPath}" })
2. Launch app: launch_mac_app({ appPath: "${appPath}" })`;

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
  name: 'get_mac_app_path_ws',
  description:
    "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
  schema: getMacAppPathWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    getMacAppPathWsSchema,
    get_mac_app_path_wsLogic,
    getDefaultCommandExecutor,
  ),
};
