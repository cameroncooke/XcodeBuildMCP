/**
 * macOS Shared Plugin: Build macOS (Unified)
 *
 * Builds a macOS app using xcodebuild from a project or workspace.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import * as z from 'zod';
import { log } from '../../../utils/logging/index.ts';
import { executeXcodeBuildCommand } from '../../../utils/build/index.ts';
import type { ToolResponse } from '../../../types/common.ts';
import { XcodePlatform } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Types for dependency injection
export interface BuildUtilsDependencies {
  executeXcodeBuildCommand: typeof executeXcodeBuildCommand;
}

// Default implementations
const defaultBuildUtilsDependencies: BuildUtilsDependencies = {
  executeXcodeBuildCommand,
};

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to use'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z.string().optional(),
  arch: z
    .enum(['arm64', 'x86_64'])
    .optional()
    .describe('Architecture to build for (arm64 or x86_64). For macOS only.'),
  extraArgs: z.array(z.string()).optional(),
  preferXcodebuild: z.boolean().optional(),
});

const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  configuration: true,
  arch: true,
  derivedDataPath: true,
  preferXcodebuild: true,
} as const);

const buildMacOSSchema = z.preprocess(
  nullifyEmptyStrings,
  baseSchemaObject
    .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
      message: 'Either projectPath or workspacePath is required.',
    })
    .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
      message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
    }),
);

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

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: baseSchemaObject,
});

export const handler = createSessionAwareTool<BuildMacOSParams>({
  internalSchema: buildMacOSSchema as unknown as z.ZodType<BuildMacOSParams, unknown>,
  logicFunction: buildMacOSLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { allOf: ['scheme'], message: 'scheme is required' },
    { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
  ],
  exclusivePairs: [['projectPath', 'workspacePath']],
});
