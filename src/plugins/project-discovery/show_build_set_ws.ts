/**
 * Project Discovery Plugin: Show Build Settings Workspace
 *
 * Shows build settings from a workspace using xcodebuild.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { executeCommand, CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

/**
 * Internal logic for showing build settings.
 */
async function _handleShowBuildSettingsLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
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
    const result = await executeCommand(command, executor, 'Show Build Settings', true);

    if (!result.success) {
      return createTextResponse(`Failed to retrieve build settings: ${result.error}`, true);
    }

    return {
      content: [
        {
          type: 'text',
          text: '✅ Build settings retrieved successfully',
        },
        {
          type: 'text',
          text: result.output || 'Build settings retrieved successfully.',
        },
        {
          type: 'text',
          text: `Next Steps:
- Build the workspace: macos_build_workspace({ workspacePath: "${params.workspacePath}", scheme: "${params.scheme}" })
- For iOS: ios_simulator_build_by_name_workspace({ workspacePath: "${params.workspacePath}", scheme: "${params.scheme}", simulatorName: "iPhone 16" })
- List schemes: list_schems_ws({ workspacePath: "${params.workspacePath}" })`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error retrieving build settings: ${errorMessage}`);
    return createTextResponse(`Error retrieving build settings: ${errorMessage}`, true);
  }
}

export default {
  name: 'show_build_set_ws',
  description:
    "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
  schema: z.object({
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
  }),
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<ToolResponse> {
    const params = args;

    // Validate required parameters
    const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', params.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    return _handleShowBuildSettingsLogic(params, executor);
  },
};
