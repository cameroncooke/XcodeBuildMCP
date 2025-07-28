/**
 * macOS Project Plugin: Build and Run macOS Project
 *
 * Builds and runs a macOS app from a project file in one step.
 */

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from '../../../utils/index.js';
import { createTextResponse } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';

type BuildRunMacProjParams = {
  projectPath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  arch?: 'arm64' | 'x86_64';
  extraArgs?: string[];
  preferXcodebuild?: boolean;
  workspacePath?: string;
};

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

/**
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(
  params: BuildRunMacProjParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
    {
      ...params,
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
  params: BuildRunMacProjParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ success: boolean; appPath?: string; error?: string }> {
  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
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
        error: result.error || 'Failed to get build settings',
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
 * Business logic for building and running macOS apps.
 */
export async function build_run_mac_projLogic(
  params: BuildRunMacProjParams,
  executor: CommandExecutor,
  execAsync?: (cmd: string) => Promise<unknown>,
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

    const appPath = appPathResult.appPath; // We know this is a valid string now
    log('info', `App path determined as: ${appPath}`);

    // 4. Launch the app using the verified path
    try {
      const execFunction = execAsync || promisify(exec);
      await execFunction(`open "${appPath}"`);
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
    } catch (launchError) {
      const errorMessage = launchError instanceof Error ? launchError.message : String(launchError);
      log('error', `Build succeeded, but failed to launch app ${appPath}: ${errorMessage}`);
      const errorResponse = createTextResponse(
        `✅ Build succeeded, but failed to launch app ${appPath}. Error: ${errorMessage}`,
        false, // Build succeeded
      );
      if (errorResponse.content) {
        errorResponse.content.unshift(...buildWarningMessages);
      }
      return errorResponse;
    }
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
  name: 'build_run_mac_proj',
  description: 'Builds and runs a macOS app from a project file in one step.',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
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
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_run_mac_projLogic(
      {
        ...(args as unknown as BuildRunMacProjParams),
        configuration: (args.configuration as string) ?? 'Debug',
        preferXcodebuild: (args.preferXcodebuild as boolean) ?? false,
      },
      getDefaultCommandExecutor(),
    );
  },
};
