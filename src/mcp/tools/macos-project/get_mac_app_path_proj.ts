/**
 * macOS Project Plugin: Get macOS App Path Project
 *
 * Gets the app bundle path for a macOS application using a project file.
 * IMPORTANT: Requires projectPath and scheme.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const getMacAppPathProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file'),
  scheme: z.string().describe('The scheme to use'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
});

// Use z.infer for type safety
type GetMacAppPathProjParams = z.infer<typeof getMacAppPathProjSchema>;

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

export async function get_mac_app_path_projLogic(
  params: GetMacAppPathProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  const configuration = params.configuration ?? 'Debug';

  log('info', `Getting app path for scheme ${params.scheme} on platform ${XcodePlatform.macOS}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the project
    command.push('-project', params.projectPath);

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', configuration);

    // Add optional derived data path
    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    // Add extra arguments if provided
    if (params.extraArgs && Array.isArray(params.extraArgs)) {
      command.push(...params.extraArgs);
    }

    // Execute the command directly with executor
    const result = await executor(command, 'Get App Path', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Failed to get macOS app path\nDetails: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.output) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: Failed to extract build settings output from the result',
          },
        ],
        isError: true,
      };
    }

    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: Could not extract app path from build settings',
          },
        ],
        isError: true,
      };
    }

    const builtProductsDir = builtProductsDirMatch[1].trim();
    const fullProductName = fullProductNameMatch[1].trim();
    const appPath = `${builtProductsDir}/${fullProductName}`;

    return {
      content: [{ type: 'text', text: `✅ macOS app path: ${appPath}` }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error retrieving app path: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error: Failed to get macOS app path\nDetails: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'get_mac_app_path_proj',
  description:
    "Gets the app bundle path for a macOS application using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_mac_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
  schema: getMacAppPathProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    getMacAppPathProjSchema,
    get_mac_app_path_projLogic,
    getDefaultCommandExecutor,
  ),
};
