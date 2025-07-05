/**
 * Device Project Plugin: Build Device Project
 *
 * Builds an app from a project file for a physical Apple device.
 * IMPORTANT: Requires projectPath and scheme.
 */

import { z } from 'zod';
import { validateRequiredParam } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';

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
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const projectValidation = validateRequiredParam('projectPath', args.projectPath);
    if (!projectValidation.isValid) return projectValidation.errorResponse;

    const schemeValidation = validateRequiredParam('scheme', args.scheme);
    if (!schemeValidation.isValid) return schemeValidation.errorResponse;

    return executeXcodeBuildCommand(
      {
        ...args,
        configuration: args.configuration ?? 'Debug', // Default config
      },
      {
        platform: XcodePlatform.iOS,
        logPrefix: 'iOS Device Build',
      },
      args.preferXcodebuild,
      'build',
    );
  },
};
