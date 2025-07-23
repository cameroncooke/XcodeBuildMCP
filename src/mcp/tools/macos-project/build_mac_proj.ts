/**
 * macOS Workspace Plugin: Build macOS Project
 *
 * Builds a macOS app using xcodebuild from a project file.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';

// Types for dependency injection
export interface BuildUtilsDependencies {
  executeXcodeBuildCommand: typeof executeXcodeBuildCommand;
}

// Default implementations
const defaultBuildUtilsDependencies: BuildUtilsDependencies = {
  executeXcodeBuildCommand,
};

const XcodePlatform = {
  iOS: 'iOS',
  watchOS: 'watchOS',
  tvOS: 'tvOS',
  visionOS: 'visionOS',
  iOSSimulator: 'iOS Simulator',
  watchOSSimulator: 'watchOS Simulator',
  tvOSSimulator: 'tvOS Simulator',
  visionOSSimulator: 'visionOS Simulator',
  macOS: 'macOS',
};

/**
 * Business logic for building macOS apps with dependency injection.
 */
export async function build_mac_projLogic(
  params: Record<string, unknown>,
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
    processedParams.preferXcodebuild,
    'build',
    executor,
  );
}

export default {
  name: 'build_mac_proj',
  description: 'Builds a macOS app using xcodebuild from a project file.',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
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
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_mac_projLogic(args, getDefaultCommandExecutor());
  },
};
