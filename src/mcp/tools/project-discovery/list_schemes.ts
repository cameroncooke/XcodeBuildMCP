/**
 * Project Discovery Plugin: List Schemes (Unified)
 *
 * Lists available schemes for either a project or workspace using xcodebuild.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import * as z from 'zod';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import type { ToolResponse } from '../../../types/common.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
});

const listSchemesSchema = z.preprocess(
  nullifyEmptyStrings,
  baseSchemaObject
    .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
      message: 'Either projectPath or workspacePath is required.',
    })
    .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
      message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
    }),
);

export type ListSchemesParams = z.infer<typeof listSchemesSchema>;

const createTextBlock = (text: string) => ({ type: 'text', text }) as const;

/**
 * Business logic for listing schemes in a project or workspace.
 * Exported for direct testing and reuse.
 */
export async function listSchemesLogic(
  params: ListSchemesParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Listing schemes');

  try {
    // For listing schemes, we can't use executeXcodeBuild directly since it's not a standard action
    // We need to create a custom command with -list flag
    const command = ['xcodebuild', '-list'];

    const hasProjectPath = typeof params.projectPath === 'string';
    const projectOrWorkspace = hasProjectPath ? 'project' : 'workspace';
    const path = hasProjectPath ? params.projectPath : params.workspacePath;

    if (hasProjectPath) {
      command.push('-project', params.projectPath!);
    } else {
      command.push('-workspace', params.workspacePath!);
    }

    const result = await executor(command, 'List Schemes', false);

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
    const nextSteps: Array<{
      tool: string;
      label: string;
      params: Record<string, string | number | boolean>;
      priority?: number;
    }> = [];
    let hintText = '';

    if (schemes.length > 0) {
      const firstScheme = schemes[0];

      nextSteps.push(
        {
          tool: 'build_macos',
          label: 'Build for macOS',
          params: { [`${projectOrWorkspace}Path`]: path!, scheme: firstScheme },
          priority: 1,
        },
        {
          tool: 'build_run_sim',
          label: 'Build and run on iOS Simulator (default for run intent)',
          params: {
            [`${projectOrWorkspace}Path`]: path!,
            scheme: firstScheme,
            simulatorName: 'iPhone 16',
          },
          priority: 2,
        },
        {
          tool: 'build_sim',
          label: 'Build for iOS Simulator (compile-only)',
          params: {
            [`${projectOrWorkspace}Path`]: path!,
            scheme: firstScheme,
            simulatorName: 'iPhone 16',
          },
          priority: 3,
        },
        {
          tool: 'show_build_settings',
          label: 'Show build settings',
          params: { [`${projectOrWorkspace}Path`]: path!, scheme: firstScheme },
          priority: 4,
        },
      );

      hintText =
        `Hint: Consider saving a default scheme with session-set-defaults ` +
        `{ scheme: "${firstScheme}" } to avoid repeating it.`;
    }

    const content = [createTextBlock('✅ Available schemes:'), createTextBlock(schemes.join('\n'))];
    if (hintText.length > 0) {
      content.push(createTextBlock(hintText));
    }

    return {
      content,
      nextSteps,
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error listing schemes: ${errorMessage}`);
    return createTextResponse(`Error listing schemes: ${errorMessage}`, true);
  }
}

const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
} as const);

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: baseSchemaObject,
});

export const handler = createSessionAwareTool<ListSchemesParams>({
  internalSchema: listSchemesSchema as unknown as z.ZodType<ListSchemesParams, unknown>,
  logicFunction: listSchemesLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
  ],
  exclusivePairs: [['projectPath', 'workspacePath']],
});
