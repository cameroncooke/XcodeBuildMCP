import { z } from 'zod';
import { handleTestLogic } from '../../../utils/index.js';
import { XcodePlatform } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const testSimIdProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
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
type TestSimIdProjParams = z.infer<typeof testSimIdProjSchema>;

export async function test_sim_id_projLogic(
  params: TestSimIdProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  return handleTestLogic(
    {
      projectPath: params.projectPath,
      scheme: params.scheme,
      simulatorId: params.simulatorId,
      configuration: params.configuration ?? 'Debug',
      derivedDataPath: params.derivedDataPath,
      extraArgs: params.extraArgs,
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.iOSSimulator,
    },
    executor,
  );
}

export default {
  name: 'test_sim_id_proj',
  description:
    'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
  schema: testSimIdProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(testSimIdProjSchema, test_sim_id_projLogic, getDefaultCommandExecutor),
};
