/**
 * Utilities Plugin: Clean (Unified)
 *
 * Cleans build products for either a project or workspace using xcodebuild.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import type { CommandExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { executeXcodeBuildCommand } from '../../../utils/build/index.js';
import { ToolResponse, SharedBuildParams, XcodePlatform } from '../../../types/common.js';
import { createErrorResponse } from '../../../utils/responses/index.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between projectPath and workspacePath, sharing common options
const baseOptions = {
  scheme: z.string().optional().describe('Optional: The scheme to clean'),
  configuration: z
    .string()
    .optional()
    .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Optional: Path where derived data might be located'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe(
      'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
    ),
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const cleanSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  })
  .refine((val) => !(val.workspacePath && !val.scheme), {
    message: 'scheme is required when workspacePath is provided.',
    path: ['scheme'],
  });

export type CleanParams = z.infer<typeof cleanSchema>;

export async function cleanLogic(
  params: CleanParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Extra safety: ensure workspace path has a scheme (xcodebuild requires it)
  if (params.workspacePath && !params.scheme) {
    return createErrorResponse(
      'Parameter validation failed',
      'Invalid parameters:\nscheme: scheme is required when workspacePath is provided.',
    );
  }
  const hasProjectPath = typeof params.projectPath === 'string';
  const typedParams: SharedBuildParams = {
    ...(hasProjectPath
      ? { projectPath: params.projectPath as string }
      : { workspacePath: params.workspacePath as string }),
    // scheme may be omitted for project; when omitted we do not pass -scheme
    // Provide empty string to satisfy type, executeXcodeBuildCommand only emits -scheme when non-empty
    scheme: params.scheme ?? '',
    configuration: params.configuration ?? 'Debug',
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  return executeXcodeBuildCommand(
    typedParams,
    {
      platform: XcodePlatform.macOS,
      logPrefix: 'Clean',
    },
    false,
    'clean',
    executor,
  );
}

export default {
  name: 'clean',
  description:
    "Cleans build products for either a project or a workspace using xcodebuild. Provide exactly one of projectPath or workspacePath. Example: clean({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape,
  handler: createTypedTool<CleanParams>(
    cleanSchema as z.ZodType<CleanParams>,
    cleanLogic,
    getDefaultCommandExecutor,
  ),
};
