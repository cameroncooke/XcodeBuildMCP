/**
 * Project Discovery Plugin: Show Build Settings Workspace
 * 
 * Shows build settings from a workspace using xcodebuild.
 */

import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { executeCommand } from '../../src/utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../src/utils/index.js';

/**
 * Internal logic for showing build settings.
 */
async function _handleShowBuildSettingsLogic(params) {
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

export default {
  name: 'show_build_set_ws',
  description: 'Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: \'/path/to/MyProject.xcworkspace\', scheme: \'MyScheme\' })',
  schema: z.object({
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
  }),
  async handler(args: any) {
    const params = args;
    const validated = this.schema.parse(params);

    // Validate required parameters
    const workspaceValidation = validateRequiredParam('workspacePath', validated.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', validated.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    return _handleShowBuildSettingsLogic(validated);
  },
};