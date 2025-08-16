/**
 * Project Discovery Plugin: Show Build Settings (Unified)
 *
 * Shows build settings from either a project or workspace using xcodebuild.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('Scheme name to show build settings for (Required)'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const showBuildSettingsSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type ShowBuildSettingsParams = z.infer<typeof showBuildSettingsSchema>;

/**
 * Business logic for showing build settings from a project or workspace.
 * Exported for direct testing and reuse.
 */
export async function showBuildSettingsLogic(
  params: ShowBuildSettingsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Showing build settings for scheme ${params.scheme}`);

  try {
    // Create the command array for xcodebuild
    const command = ['xcodebuild', '-showBuildSettings']; // -showBuildSettings as an option, not an action

    const hasProjectPath = typeof params.projectPath === 'string';
    const path = hasProjectPath ? params.projectPath : params.workspacePath;

    if (hasProjectPath) {
      command.push('-project', params.projectPath!);
    } else {
      command.push('-workspace', params.workspacePath!);
    }

    // Add the scheme
    command.push('-scheme', params.scheme);

    // Execute the command directly
    const result = await executor(command, 'Show Build Settings', true);

    if (!result.success) {
      return createTextResponse(`Failed to show build settings: ${result.error}`, true);
    }

    // Create response based on which type was used (similar to workspace version with next steps)
    const content: Array<{ type: 'text'; text: string }> = [
      {
        type: 'text',
        text: hasProjectPath
          ? `✅ Build settings for scheme ${params.scheme}:`
          : '✅ Build settings retrieved successfully',
      },
      {
        type: 'text',
        text: result.output || 'Build settings retrieved successfully.',
      },
    ];

    // Add next steps for workspace (similar to original workspace implementation)
    if (!hasProjectPath && path) {
      content.push({
        type: 'text',
        text: `Next Steps:
- Build the workspace: build_macos({ workspacePath: "${path}", scheme: "${params.scheme}" })
- For iOS: build_sim({ workspacePath: "${path}", scheme: "${params.scheme}", simulatorName: "iPhone 16" })
- List schemes: list_schemes({ workspacePath: "${path}" })`,
      });
    }

    return {
      content,
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error showing build settings: ${errorMessage}`);
    return createTextResponse(`Error showing build settings: ${errorMessage}`, true);
  }
}

export default {
  name: 'show_build_settings',
  description:
    "Shows build settings from either a project or workspace using xcodebuild. Provide exactly one of projectPath or workspacePath, plus scheme. Example: show_build_settings({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape,
  handler: createTypedTool<ShowBuildSettingsParams>(
    showBuildSettingsSchema as z.ZodType<ShowBuildSettingsParams>,
    showBuildSettingsLogic,
    getDefaultCommandExecutor,
  ),
};
