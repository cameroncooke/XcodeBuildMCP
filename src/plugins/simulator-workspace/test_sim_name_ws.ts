import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { XcodePlatform } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';
import { handleTestLogic } from '../../utils/test-common.js';

// Schema definitions
const workspacePathSchema = z.string().describe('Path to the .xcworkspace file (Required)');
const schemeSchema = z.string().describe('The scheme to use (Required)');
const configurationSchema = z
  .string()
  .optional()
  .describe('Build configuration (Debug, Release, etc.)');
const derivedDataPathSchema = z
  .string()
  .optional()
  .describe('Path where build products and other derived data will go');
const extraArgsSchema = z.array(z.string()).optional().describe('Additional xcodebuild arguments');
const simulatorNameSchema = z
  .string()
  .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)");
const useLatestOSSchema = z
  .boolean()
  .optional()
  .describe('Whether to use the latest OS version for the named simulator');
const preferXcodebuildSchema = z
  .boolean()
  .optional()
  .describe(
    'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
  );

export async function test_sim_name_wsLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  return handleTestLogic(
    {
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
    },
    executor,
  );
}

export default {
  name: 'test_sim_name_ws',
  description:
    'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.',
  schema: {
    workspacePath: workspacePathSchema,
    scheme: schemeSchema,
    simulatorName: simulatorNameSchema,
    configuration: configurationSchema,
    derivedDataPath: derivedDataPathSchema,
    extraArgs: extraArgsSchema,
    useLatestOS: useLatestOSSchema,
    preferXcodebuild: preferXcodebuildSchema,
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return test_sim_name_wsLogic(args, getDefaultCommandExecutor());
  },
};
