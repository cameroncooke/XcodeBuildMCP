/**
 * macOS Workspace Plugin: Build macOS Workspace
 *
 * Builds a macOS app using xcodebuild from a workspace.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

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
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(params: any): Promise<ToolResponse> {
  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuildCommand(
    {
      ...params,
    },
    {
      platform: XcodePlatform.macOS,
      arch: params.arch,
      logPrefix: 'macOS Build',
    },
    params.preferXcodebuild,
    'build',
  );
}

export default {
  name: 'build_mac_ws',
  description: 'Builds a macOS app using xcodebuild from a workspace.',
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
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
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  async handler(args: any): Promise<ToolResponse> {
    const params = args;
    return _handleMacOSBuildLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      preferXcodebuild: params.preferXcodebuild ?? false,
    });
  },
};
