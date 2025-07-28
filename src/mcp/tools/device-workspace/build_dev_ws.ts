/**
 * Device Workspace Plugin: Build Device Workspace
 *
 * Builds an app from a workspace for a physical Apple device.
 * IMPORTANT: Requires workspacePath and scheme.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';

type BuildDevWsParams = {
  workspacePath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
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

export async function build_dev_wsLogic(
  params: BuildDevWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;

  const workspaceValidation = validateRequiredParam('workspacePath', paramsRecord.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', paramsRecord.scheme);
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
  name: 'build_dev_ws',
  description:
    "Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. Example: build_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file'),
    scheme: z.string().describe('The scheme to build'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
    derivedDataPath: z.string().optional().describe('Path to derived data directory'),
    extraArgs: z
      .array(z.string())
      .optional()
      .describe('Additional arguments to pass to xcodebuild'),
    preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return build_dev_wsLogic(args as unknown as BuildDevWsParams, getDefaultCommandExecutor());
  },
};
