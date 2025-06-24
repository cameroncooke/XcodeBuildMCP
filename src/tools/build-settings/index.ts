/**
 * Build Settings and Scheme Tools - Tools for viewing build settings and listing schemes
 *
 * This module provides tools for retrieving build settings and listing available schemes
 * from Xcode projects and workspaces. These tools are useful for debugging and exploring
 * project configuration.
 *
 * Responsibilities:
 * - Listing available schemes in Xcode projects and workspaces
 * - Retrieving detailed build settings for specific schemes
 * - Providing formatted output for build settings
 * - Supporting both project and workspace-based operations
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../../utils/logger.js';
import { executeCommand } from '../../utils/command.js';
import { validateRequiredParam, createTextResponse } from '../../utils/validation.js';
import { ToolResponse } from '../../types/common.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
} from '../common/index.js';

// --- Private Helper Functions ---

/**
 * Internal logic for showing build settings.
 */
async function _handleShowBuildSettingsLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
}): Promise<ToolResponse> {
  log('info', `Showing build settings for scheme ${params.scheme}`);

  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings']; // -showBuildSettings as an option, not an action

    // Add the workspace or project
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    // Add the scheme
    command.push('-scheme', params.scheme);

    // Execute the command directly
    const result = await executeCommand(command, 'Show Build Settings');

    if (!result.success) {
      return createTextResponse(`Failed to show build settings: ${result.error}`, true);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Build settings for scheme ${params.scheme}:`,
        },
        {
          type: 'text',
          text: result.output || 'Build settings retrieved successfully.',
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error showing build settings: ${errorMessage}`);
    return createTextResponse(`Error showing build settings: ${errorMessage}`, true);
  }
}

/**
 * Internal logic for listing schemes.
 */
async function _handleListSchemesLogic(params: {
  workspacePath?: string;
  projectPath?: string;
}): Promise<ToolResponse> {
  log('info', 'Listing schemes');

  try {
    // For listing schemes, we can't use executeXcodeBuild directly since it's not a standard action
    // We need to create a custom command with -list flag
    const command = ['xcodebuild', '-list'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    } // No else needed, one path is guaranteed by callers

    const result = await executeCommand(command, 'List Schemes');

    if (!result.success) {
      return createTextResponse(`Failed to list schemes: ${result.error}`, true);
    }

    // Extract schemes from the output
    const schemesMatch = result.output.match(/Schemes:([\s\S]*?)(?=\n\n|$)/);

    if (!schemesMatch) {
      return createTextResponse('No schemes found in the output', true);
    }

    const schemeLines = schemesMatch[1].trim().split('\n');
    const schemes = schemeLines.map((line) => line.trim()).filter((line) => line);

    // Prepare next steps with the first scheme if available
    let nextStepsText = '';
    if (schemes.length > 0) {
      const firstScheme = schemes[0];
      const projectOrWorkspace = params.workspacePath ? 'workspace' : 'project';
      const path = params.workspacePath || params.projectPath;

      nextStepsText = `Next Steps:
1. Build the app: ${projectOrWorkspace === 'workspace' ? 'macos_build_workspace' : 'macos_build_project'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })
   or for iOS: ${projectOrWorkspace === 'workspace' ? 'ios_simulator_build_by_name_workspace' : 'ios_simulator_build_by_name_project'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}", simulatorName: "iPhone 16" })
2. Show build settings: ${projectOrWorkspace === 'workspace' ? 'show_build_set_ws' : 'show_build_set_proj'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Available schemes:`,
        },
        {
          type: 'text',
          text: schemes.join('\n'),
        },
        {
          type: 'text',
          text: nextStepsText,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error listing schemes: ${errorMessage}`);
    return createTextResponse(`Error listing schemes: ${errorMessage}`, true);
  }
}

// --- Public Tool Definitions ---

/**
 * Registers the show build settings workspace tool
 */
export function registerShowBuildSettingsWorkspaceTool(server: McpServer): void {
  registerTool<BaseWorkspaceParams>(
    server,
    'show_build_set_ws',
    "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
    },
    async (params: BaseWorkspaceParams) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleShowBuildSettingsLogic(params);
    },
  );
}

/**
 * Registers the show build settings project tool
 */
export function registerShowBuildSettingsProjectTool(server: McpServer): void {
  registerTool<BaseProjectParams>(
    server,
    'show_build_set_proj',
    "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_set_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
    },
    async (params: BaseProjectParams) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleShowBuildSettingsLogic(params);
    },
  );
}

/**
 * Registers the list schemes workspace tool
 */
export function registerListSchemesWorkspaceTool(server: McpServer): void {
  registerTool<BaseWorkspaceParams>(
    server,
    'list_schems_ws',
    "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schems_ws({ workspacePath: '/path/to/MyProject.xcworkspace' })",
    {
      workspacePath: workspacePathSchema,
    },
    async (params: BaseWorkspaceParams) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      return _handleListSchemesLogic(params);
    },
  );
}

/**
 * Registers the list schemes project tool
 */
export function registerListSchemesProjectTool(server: McpServer): void {
  registerTool<BaseProjectParams>(
    server,
    'list_schems_proj',
    "Lists available schemes in the project file. IMPORTANT: Requires projectPath. Example: list_schems_proj({ projectPath: '/path/to/MyProject.xcodeproj' })",
    {
      projectPath: projectPathSchema,
    },
    async (params: BaseProjectParams) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      return _handleListSchemesLogic(params);
    },
  );
}
