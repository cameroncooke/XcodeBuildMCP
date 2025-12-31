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
import { ToolResponse } from '../../../types/common.ts';
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
      error: 'Either projectPath or workspacePath is required.',
    })
    .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
      error: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
    }),
);

export type ListSchemesParams = z.infer<typeof listSchemesSchema>;

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

      // Note: After Phase 2, these will be unified tool names too
      nextStepsText = `Next Steps:
1. Build the app: build_macos({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })
   or for iOS: build_sim({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}", simulatorName: "iPhone 16" })
2. Show build settings: show_build_settings({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })`;
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

const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
} as const);

export default {
  name: 'list_schemes',
  description: 'Lists schemes for a project or workspace.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: baseSchemaObject,
  }),
  annotations: {
    title: 'List Schemes',
    readOnlyHint: true,
  },
  handler: createSessionAwareTool<ListSchemesParams>({
    internalSchema: listSchemesSchema as unknown as z.ZodType<ListSchemesParams, unknown>,
    logicFunction: listSchemesLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
    ],
    exclusivePairs: [['projectPath', 'workspacePath']],
  }),
};
