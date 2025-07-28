/**
 * Project Discovery Plugin: Show Build Settings Project
 *
 * Shows build settings from a project file using xcodebuild.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';

/**
 * Parameters for show_build_set_proj operation
 */
interface ShowBuildSetProjParams {
  projectPath: string;
  scheme: string;
}

/**
 * Business logic for showing build settings from a project file.
 *
 * @param params - The validated parameters for the operation
 * @param executor - The command executor for running xcodebuild commands
 * @returns Promise resolving to a ToolResponse with build settings or error information
 */
export async function show_build_set_projLogic(
  params: unknown,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Validate required parameters
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse;

  // Cast to proper type after validation
  const typedParams: ShowBuildSetProjParams = {
    projectPath: params.projectPath as string,
    scheme: params.scheme as string,
  };

  log('info', `Showing build settings for scheme ${typedParams.scheme}`);

  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings']; // -showBuildSettings as an option, not an action

    // Add the project
    command.push('-project', typedParams.projectPath);

    // Add the scheme
    command.push('-scheme', typedParams.scheme);

    // Execute the command directly
    const result = await executor(command, 'Show Build Settings', true);

    if (!result.success) {
      return createTextResponse(`Failed to show build settings: ${result.error}`, true);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Build settings for scheme ${typedParams.scheme}:`,
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
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('Scheme name to show build settings for (Required)'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return show_build_set_projLogic(args, getDefaultCommandExecutor());
  },
};
