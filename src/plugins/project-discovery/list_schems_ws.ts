/**
 * Project Discovery Plugin: List Schemes Workspace
 *
 * Lists available schemes in the workspace.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

/**
 * Parameters for listing schemes in workspace
 */
export interface ListSchemsWsParams {
  workspacePath: string;
}

/**
 * Business logic for listing schemes in workspace.
 * Extracted for separation of concerns and testability.
 */
export async function list_schems_wsLogic(
  params: ListSchemsWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Listing schemes');

  try {
    // For listing schemes, we can't use executeXcodeBuild directly since it's not a standard action
    // We need to create a custom command with -list flag
    const command = ['xcodebuild', '-list'];

    // Add workspace parameter (guaranteed to exist by validation)
    command.push('-workspace', params.workspacePath);

    const result = await executor(command, 'List Schemes', true);

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

      nextStepsText = `Next Steps:
1. Build the app: macos_build_workspace({ workspacePath: "${params.workspacePath}", scheme: "${firstScheme}" })
   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "${params.workspacePath}", scheme: "${firstScheme}", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_ws({ workspacePath: "${params.workspacePath}", scheme: "${firstScheme}" })`;
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

export default {
  name: 'list_schems_ws',
  description:
    "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schems_ws({ workspacePath: '/path/to/MyProject.xcworkspace' })",
  schema: z.object({
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  }),
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    // Validate required parameters
    const workspaceValidation = validateRequiredParam('workspacePath', args.workspacePath);
    if (!workspaceValidation.isValid) return workspaceValidation.errorResponse;

    // Transform args to typed parameters
    const params: ListSchemsWsParams = {
      workspacePath: args.workspacePath as string,
    };

    return list_schems_wsLogic(params, getDefaultCommandExecutor());
  },
};
