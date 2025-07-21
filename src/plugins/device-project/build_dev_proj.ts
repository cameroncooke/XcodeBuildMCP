/**
 * Device Project Plugin: Build Device Project
 *
 * Builds an app from a project file for a physical Apple device.
 * IMPORTANT: Requires projectPath and scheme.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { validateRequiredParam } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';

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
 * Parameters for build device project tool
 */
export interface BuildDevProjParams {
  projectPath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
}

/**
 * Business logic for building device project
 */
export async function build_dev_projLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  return executeXcodeBuildCommand(
    {
      ...params,
      configuration: params.configuration ?? 'Debug', // Default config
    },
    {
      platform: XcodePlatform.iOS,
      logPrefix: 'iOS Device Build',
    },
    params.preferXcodebuild,
    'build',
    executor,
  );
}

export default {
  name: 'build_dev_proj',
  description:
    "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
    scheme: z.string().describe('The scheme to build'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
    derivedDataPath: z.string().optional().describe('Path to derived data directory'),
    extraArgs: z
      .array(z.string())
      .optional()
      .describe('Additional arguments to pass to xcodebuild'),
    preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_dev_projLogic(args, getDefaultCommandExecutor());
  },
};
