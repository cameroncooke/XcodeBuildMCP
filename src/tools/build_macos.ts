/**
 * macOS Build Tools - Tools for building and running macOS applications
 *
 * This module provides specialized tools for building and running macOS applications
 * using xcodebuild. It supports both workspace and project-based builds with architecture
 * specification (arm64 or x86_64).
 *
 * Responsibilities:
 * - Building macOS applications from project files and workspaces
 * - Running macOS applications after building
 * - Supporting architecture-specific builds (arm64, x86_64)
 * - Handling build configuration and derived data paths
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from '../utils/logger.js';
import { XcodePlatform } from '../utils/xcode.js';
import { executeCommand } from '../utils/command.js';
import { createTextResponse } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { executeXcodeBuildCommand } from '../utils/build-utils.js';
import { z } from 'zod';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  preferXcodebuildSchema,
} from './common.js';

// Schema for architecture parameter
const archSchema = z
  .enum(['arm64', 'x86_64'])
  .optional()
  .describe('Architecture to build for (arm64 or x86_64). For macOS only.');

// --- Private Helper Functions ---

/**
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  arch?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
}): Promise<ToolResponse> {
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
  );
}

async function _getAppPathFromBuildSettings(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  arch?: string;
  extraArgs?: string[];
}): Promise<{ success: boolean; appPath?: string; error?: string }> {
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
    command.push('-configuration', params.configuration);

    // Add derived data path if provided
    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    // Add extra args if provided
    if (params.extraArgs && params.extraArgs.length > 0) {
      command.push(...params.extraArgs);
    }

    // Execute the command directly
    const result = await executeCommand(command, 'Get Build Settings for Launch');

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
 * Internal logic for building and running macOS apps.
 */
async function _handleMacOSBuildAndRunLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  arch?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
}): Promise<ToolResponse> {
  log('info', 'Handling macOS build & run logic...');
  const _warningMessages: { type: 'text'; text: string }[] = [];
  const _warningRegex = /\[warning\]: (.*)/g;

  try {
    // First, build the app
    const buildResult = await _handleMacOSBuildLogic(params);

    // 1. Check if the build itself failed
    if (buildResult.isError) {
      return buildResult; // Return build failure directly
    }
    const buildWarningMessages = buildResult.content?.filter((c) => c.type === 'text') ?? [];

    // 2. Build succeeded, now get the app path using the helper
    const appPathResult = await _getAppPathFromBuildSettings(params);

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
    // Launch the app
    try {
      await promisify(exec)(`open "${appPath}"`);
      log('info', `✅ macOS app launched successfully: ${appPath}`);
      const successResponse: ToolResponse = {
        content: [
          ...buildWarningMessages,
          {
            type: 'text',
            text: `✅ macOS build and run succeeded for scheme ${params.scheme}. App launched: ${appPath}`,
          },
        ],
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

// --- Public Tool Definitions ---

// Register macOS build workspace tool
export function registerMacOSBuildWorkspaceTool(server: McpServer): void {
  type WorkspaceParams = {
    workspacePath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    arch?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<WorkspaceParams>(
    server,
    'build_mac_ws',
    'Builds a macOS app using xcodebuild from a workspace.',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      arch: archSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      _handleMacOSBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
      }),
  );
}

// Register macOS build project tool
export function registerMacOSBuildProjectTool(server: McpServer): void {
  type ProjectParams = {
    projectPath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    arch?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<ProjectParams>(
    server,
    'build_mac_proj',
    'Builds a macOS app using xcodebuild from a project file.',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      arch: archSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      _handleMacOSBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
      }),
  );
}

// Register macOS build and run workspace tool
export function registerMacOSBuildAndRunWorkspaceTool(server: McpServer): void {
  type WorkspaceParams = {
    workspacePath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    arch?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<WorkspaceParams>(
    server,
    'build_run_mac_ws',
    'Builds and runs a macOS app from a workspace in one step.',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      _handleMacOSBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
      }),
  );
}

// Register macOS build and run project tool
export function registerMacOSBuildAndRunProjectTool(server: McpServer): void {
  type ProjectParams = {
    projectPath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    arch?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<ProjectParams>(
    server,
    'build_run_mac_proj',
    'Builds and runs a macOS app from a project file in one step.',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      _handleMacOSBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
      }),
  );
}
