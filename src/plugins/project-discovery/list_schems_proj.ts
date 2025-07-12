/**
 * Project Discovery Plugin: List Schemes Project
 *
 * Lists available schemes in the project file.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

/**
 * Internal logic for listing schemes.
 */
async function _handleListSchemesLogic(params: Record<string, unknown>): Promise<ToolResponse> {
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

export default {
  name: 'list_schems_proj',
  description:
    "Lists available schemes in the project file. IMPORTANT: Requires projectPath. Example: list_schems_proj({ projectPath: '/path/to/MyProject.xcodeproj' })",
  schema: z.object({
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
  }),
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const params = args;
    const validated = this.schema.parse(params);

    // Validate required parameters
    const projectValidation = validateRequiredParam('projectPath', validated.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    return _handleListSchemesLogic(validated);
  },
};
