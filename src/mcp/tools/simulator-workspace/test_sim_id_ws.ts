import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { XcodePlatform } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { handleTestLogic } from '../../../utils/test-common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const testSimIdWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  simulatorId: z
    .string()
    .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
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
});

// Use z.infer for type safety
type TestSimIdWsParams = z.infer<typeof testSimIdWsSchema>;

export async function test_sim_id_wsLogic(
  params: TestSimIdWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  return handleTestLogic(
    {
      workspacePath: params.workspacePath,
      scheme: params.scheme,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.iOSSimulator,
      simulatorId: params.simulatorId,
      derivedDataPath: params.derivedDataPath,
      extraArgs: params.extraArgs,
    },
    executor,
  );
}

export default {
  name: 'test_sim_id_ws',
  description:
    'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
  schema: testSimIdWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(testSimIdWsSchema, test_sim_id_wsLogic, getDefaultCommandExecutor),
};
