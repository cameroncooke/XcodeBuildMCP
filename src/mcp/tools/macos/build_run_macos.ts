/**
 * macOS Shared Plugin: Build and Run macOS (Unified)
 *
 * Builds and runs a macOS app from a project or workspace in one step.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { createTextResponse } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to use'),
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
    .describe('If true, prefers xcodebuild over the experimental incremental build system'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildRunMacOSSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type BuildRunMacOSParams = z.infer<typeof buildRunMacOSSchema>;

/**
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(
  params: BuildRunMacOSParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
    {
      ...params,
      configuration: params.configuration ?? 'Debug',
    },
    {
      platform: XcodePlatform.macOS,
      arch: params.arch,
      logPrefix: 'macOS Build',
    },
    params.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

async function _getAppPathFromBuildSettings(
  params: BuildRunMacOSParams,
  executor: CommandExecutor,
): Promise<{ success: true; appPath: string } | { success: false; error: string }> {
  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the project or workspace
    if (params.projectPath) {
      command.push('-project', params.projectPath);
    } else if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    }

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration ?? 'Debug');

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
    const builtProductsDirMatch = buildSettingsOutput.match(/^\s*BUILT_PRODUCTS_DIR\s*=\s*(.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/^\s*FULL_PRODUCT_NAME\s*=\s*(.+)$/m);

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
 * Business logic for building and running macOS apps.
 */
export async function buildRunMacOSLogic(
  params: BuildRunMacOSParams,
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
    if (!appPathResult.success) {
      log('error', 'Build succeeded, but failed to get app path to launch.');
      const response = createTextResponse(
        `✅ Build succeeded, but failed to get app path to launch: ${appPathResult.error}`,
        false, // Build succeeded, so not a full error
      );
      if (response.content) {
        response.content.unshift(...buildWarningMessages);
      }
      return response;
    }

    const appPath = appPathResult.appPath; // success === true narrows to string
    log('info', `App path determined as: ${appPath}`);

    // 4. Launch the app using CommandExecutor
    const launchResult = await executor(['open', appPath], 'Launch macOS App', true);

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
  name: 'build_run_macos',
  description:
    "Builds and runs a macOS app from a project or workspace in one step. Provide exactly one of projectPath or workspacePath. Example: build_run_macos({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<BuildRunMacOSParams>(
    buildRunMacOSSchema as z.ZodType<BuildRunMacOSParams>,
    (params: BuildRunMacOSParams, executor) =>
      buildRunMacOSLogic(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          preferXcodebuild: params.preferXcodebuild ?? false,
        },
        executor,
      ),
    getDefaultCommandExecutor,
  ),
};
