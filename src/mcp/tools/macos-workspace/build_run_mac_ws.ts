/**
 * macOS Workspace Plugin: Build and Run macOS Workspace
 *
 * Builds and runs a macOS app from a workspace in one step.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { createTextResponse } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const buildRunMacWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe(
      'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
    ),
});

// Use z.infer for type safety
type BuildRunMacWsParams = z.infer<typeof buildRunMacWsSchema>;

/**
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(
  params: BuildRunMacWsParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
    {
      workspacePath: params.workspacePath,
      scheme: params.scheme,
      configuration: params.configuration ?? 'Debug',
      derivedDataPath: params.derivedDataPath,
      extraArgs: params.extraArgs,
    },
    {
      platform: XcodePlatform.macOS,
      arch: params.arch,
      logPrefix: 'macOS Build',
    },
    params.preferXcodebuild,
    'build',
    executor,
  );
}

async function _getAppPathFromBuildSettings(
  params: BuildRunMacWsParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ success: boolean; appPath?: string; error?: string } | null> {
  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace
    command.push('-workspace', params.workspacePath);

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration!);

    // Add derived data path if provided
    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    // Add extra args if provided
    if (params.extraArgs && params.extraArgs.length > 0) {
      command.push(...params.extraArgs);
    }

    // Execute the command directly
    const result = await executor(command, 'Get Build Settings for Launch', true, undefined);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Failed to get build settings',
      };
    }

    // Parse the output to extract the app path
    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return { success: false, error: 'Could not extract app path from build settings' };
    }

    const appPath = `${builtProductsDirMatch[1].trim()}/${fullProductNameMatch[1].trim()}`;
    return { success: true, appPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Exported business logic for building and running macOS apps.
 */
export async function build_run_mac_wsLogic(
  params: BuildRunMacWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Handling macOS build & run logic...');

  try {
    // First, build the app
    const buildResult = await _handleMacOSBuildLogic(params, executor);

    // 1. Check if the build itself failed
    if (buildResult.isError) {
      return buildResult; // Return build failure directly
    }
    const buildWarningMessages = buildResult.content?.filter((c) => c.type === 'text') ?? [];

    // 2. Build succeeded, now get the app path using the helper
    const appPathResult = await _getAppPathFromBuildSettings(params, executor);

    // 3. Check if getting the app path failed
    if (!appPathResult?.success) {
      log('error', 'Build succeeded, but failed to get app path to launch.');
      const response = createTextResponse(
        `✅ Build succeeded, but failed to get app path to launch: ${appPathResult?.error ?? 'Unknown error'}`,
        false, // Build succeeded, so not a full error
      );
      if (response.content) {
        response.content.unshift(...buildWarningMessages);
      }
      return response;
    }

    const appPath = appPathResult.appPath; // We know this is a valid string now
    log('info', `App path determined as: ${appPath}`);

    // 4. Launch the app using the verified path
    const launchResult = await executor(['open', appPath!], 'Launch macOS App', true);

    if (!launchResult.success) {
      log('error', `Build succeeded, but failed to launch app ${appPath}: ${launchResult.error}`);
      const errorResponse = createTextResponse(
        `✅ Build succeeded, but failed to launch app ${appPath}. Error: ${launchResult.error}`,
        false, // Build succeeded
      );
      if (errorResponse.content) {
        errorResponse.content.unshift(...buildWarningMessages);
      }
      return errorResponse;
    }

    log('info', `✅ macOS app launched successfully: ${appPath}`);
    const successResponse: ToolResponse = {
      content: [
        ...buildWarningMessages,
        {
          type: 'text',
          text: `✅ macOS build and run succeeded for scheme ${params.scheme}. App launched: ${appPath}`,
        },
      ],
      isError: false,
    };
    return successResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during macOS build & run logic: ${errorMessage}`);
    const errorResponse = createTextResponse(
      `Error during macOS build and run: ${errorMessage}`,
      true,
    );
    return errorResponse;
  }
}

export default {
  name: 'build_run_mac_ws',
  description: 'Builds and runs a macOS app from a workspace in one step.',
  schema: buildRunMacWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    buildRunMacWsSchema,
    (params: BuildRunMacWsParams) =>
      build_run_mac_wsLogic(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          preferXcodebuild: params.preferXcodebuild ?? false,
        },
        getDefaultCommandExecutor(),
      ),
    getDefaultCommandExecutor,
  ),
};
