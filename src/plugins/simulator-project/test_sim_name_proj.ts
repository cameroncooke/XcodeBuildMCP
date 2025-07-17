import { z } from 'zod';
import { handleTestLogic } from '../../utils/index.js';
import { XcodePlatform } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';

export default {
  name: 'test_sim_name_proj',
  description:
    'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z
      .string()
      .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<ToolResponse> {
    const params = args;
    return handleTestLogic(
      {
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? false,
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOSSimulator,
      },
      executor,
    );
  },
};
