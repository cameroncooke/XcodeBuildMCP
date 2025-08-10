/**
 * macOS Shared Plugin: Get macOS App Path (Unified)
 *
 * Gets the app bundle path for a macOS application using either a project or workspace.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Helper: convert empty strings to undefined (shallow) so optional fields don't trip validation
function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}

// Unified schema: XOR between projectPath and workspacePath, sharing common options
const baseOptions = {
  scheme: z.string().describe('The scheme to use'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const getMacosAppPathSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

// Use z.infer for type safety
type GetMacosAppPathParams = z.infer<typeof getMacosAppPathSchema>;

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

export async function get_macos_app_pathLogic(
  params: GetMacosAppPathParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const configuration = params.configuration ?? 'Debug';

  log('info', `Getting app path for scheme ${params.scheme} on platform ${XcodePlatform.macOS}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the project or workspace
    if (params.projectPath) {
      command.push('-project', params.projectPath);
    } else {
      command.push('-workspace', params.workspacePath!);
    }

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', configuration);

    // Add optional derived data path (only for projects)
    if (params.derivedDataPath && params.projectPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    // Handle destination for macOS (only for workspaces)
    if (params.workspacePath) {
      let destinationString = 'platform=macOS';
      if (params.arch) {
        destinationString += `,arch=${params.arch}`;
      }
      command.push('-destination', destinationString);
    }

    // Add extra arguments if provided (only for projects)
    if (params.extraArgs && Array.isArray(params.extraArgs) && params.projectPath) {
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

    // Include next steps guidance (following workspace pattern)
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
  name: 'get_macos_app_path',
  description:
    "Gets the app bundle path for a macOS application using either a project or workspace. Provide exactly one of projectPath or workspacePath. Example: get_macos_app_path({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<GetMacosAppPathParams>(
    getMacosAppPathSchema as unknown as z.ZodType<GetMacosAppPathParams>,
    get_macos_app_pathLogic,
    getDefaultCommandExecutor,
  ),
};
