/**
 * macOS Shared Plugin: Build macOS (Unified)
 *
 * Builds a macOS app using xcodebuild from a project or workspace.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Types for dependency injection
export interface BuildUtilsDependencies {
  executeXcodeBuildCommand: typeof executeXcodeBuildCommand;
}

// Default implementations
const defaultBuildUtilsDependencies: BuildUtilsDependencies = {
  executeXcodeBuildCommand,
};

// Helper: convert empty strings to undefined (shallow) so optional fields don't trip validation
function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to use'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe('If true, prefers xcodebuild over the experimental incremental build system'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildMacOSSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type BuildMacOSParams = z.infer<typeof buildMacOSSchema>;

/**
 * Business logic for building macOS apps from project or workspace with dependency injection.
 * Exported for direct testing and reuse.
 */
export async function buildMacOSLogic(
  params: BuildMacOSParams,
  executor: CommandExecutor,
  buildUtilsDeps: BuildUtilsDependencies = defaultBuildUtilsDependencies,
): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  const processedParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  return buildUtilsDeps.executeXcodeBuildCommand(
    processedParams,
    {
      platform: XcodePlatform.macOS,
      arch: params.arch,
      logPrefix: 'macOS Build',
    },
    processedParams.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

export default {
  name: 'build_macos',
  description:
    "Builds a macOS app using xcodebuild from a project or workspace. Provide exactly one of projectPath or workspacePath. Example: build_macos({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<BuildMacOSParams>(
    buildMacOSSchema as unknown as z.ZodType<BuildMacOSParams>,
    buildMacOSLogic,
    getDefaultCommandExecutor,
  ),
};
