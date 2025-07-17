/**
 * Project Discovery Plugin: Show Build Settings Project
 *
 * Shows build settings from a project file using xcodebuild.
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
    const result = await executeCommand(command, undefined, executor, 'Show Build Settings', true);

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

export default {
  name: 'show_build_set_proj',
  description:
    "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_set_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: z.object({
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('Scheme name to show build settings for (Required)'),
  }),
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<ToolResponse> {
    const params = args;
    const validated = this.schema.parse(params);

    // Validate required parameters
    const projectValidation = validateRequiredParam('projectPath', validated.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', validated.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    return _handleShowBuildSettingsLogic(validated, executor);
  },
};
