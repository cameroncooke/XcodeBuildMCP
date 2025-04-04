import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';
import {
  executeXcodeCommand,
  XcodePlatform,
} from '../utils/xcode.js';
import {
  validateRequiredParam,
  createTextResponse,
} from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
} from './common.js';

// --- Parameter Type Definitions (Specific to iOS Device Build) ---
// None needed currently, using base types

// --- Private Helper Functions ---

/**
 * Internal logic for building iOS device apps.
 */
async function _handleIOSDeviceBuildLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  const warningMessages: { type: 'text'; text: string }[] = [];

  log('info', `Starting iOS device build for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    command.push('-destination', 'generic/platform=iOS');

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push('build');

    const result = await executeXcodeCommand(command, 'iOS Device Build');

    // Check for warnings in the output
    const warningRegex = /^warning: (.*)$/gm;
    let match;
    while ((match = warningRegex.exec(result.output)) !== null) {
      warningMessages.push({ type: 'text', text: `⚠️ Warning: ${match[1]}` });
    }

    if (!result.success) {
      log('error', `iOS device build failed for scheme ${params.scheme}: ${result.error}`);
      const errorResponse = createTextResponse(
        `❌ iOS device build failed for scheme ${params.scheme}. Error: ${result.error}`,
        true
      );
      if (warningMessages.length > 0 && errorResponse.content) {
          errorResponse.content.unshift(...warningMessages);
      }
      return errorResponse;
    }

    log('info', `✅ iOS device build succeeded for scheme ${params.scheme}.`);
    const successResponse: ToolResponse = {
        content: [
            ...warningMessages, // Add warnings first
            { type: 'text', text: `✅ iOS device build succeeded for scheme ${params.scheme}.`},
            { type: 'text', text: `Next steps depend on your workflow (e.g., archiving, distributing). You can get the app path using 'get_app_path_for_device_...'`}
        ]
    };
    return successResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during iOS device build: ${errorMessage}`);
    return createTextResponse(`Error during iOS device build: ${errorMessage}`, true);
  }
}

// --- Tool Registration Functions ---

/**
 * Registers the ios_device_build_workspace tool.
 */
export function registerIOSDeviceBuildWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams;
  registerTool<Params>(
    server,
    'ios_device_build_workspace',
    "Builds an iOS app from a workspace for a physical device. IMPORTANT: Requires workspacePath and scheme. Example: ios_device_build_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleIOSDeviceBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug', // Default config
      });
    }
  );
}

/**
 * Registers the ios_device_build_project tool.
 */
export function registerIOSDeviceBuildProjectTool(server: McpServer): void {
  type Params = BaseProjectParams;
  registerTool<Params>(
    server,
    'ios_device_build_project',
    "Builds an iOS app from a project file for a physical device. IMPORTANT: Requires projectPath and scheme. Example: ios_device_build_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleIOSDeviceBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug', // Default config
      });
    }
  );
}

// Register both iOS device build tools
export function registerIOSDeviceBuildTools(server: McpServer): void {
  registerIOSDeviceBuildWorkspaceTool(server);
  registerIOSDeviceBuildProjectTool(server);
}
