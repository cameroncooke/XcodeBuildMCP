/**
 * Project Discovery Plugin: Show Build Settings Workspace
 *
 * Shows build settings from a workspace using xcodebuild.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const showBuildSetWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
});

// Use z.infer for type safety
type ShowBuildSetWsParams = z.infer<typeof showBuildSetWsSchema>;

/**
 * Business logic for showing build settings from a workspace.
 */
export async function show_build_set_wsLogic(
  params: ShowBuildSetWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Validate required parameters
  const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  log('info', `Showing build settings for scheme ${params.scheme}`);

  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings']; // -showBuildSettings as an option, not an action

    // Add the workspace (always present since it's required in the schema)
    command.push('-workspace', params.workspacePath);

    // Add the scheme
    command.push('-scheme', params.scheme);

    // Execute the command directly
    const result = await executor(command, 'Show Build Settings', true);

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
  schema: showBuildSetWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(showBuildSetWsSchema, show_build_set_wsLogic, getDefaultCommandExecutor),
};
