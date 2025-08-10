/**
 * Simulator-Shared Plugin: test_simulator_id (Unified)
 *
 * Runs tests for either a project or workspace on a simulator by UUID using xcodebuild test.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { XcodePlatform } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { handleTestLogic } from '../../../utils/test-common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Helper: convert empty strings to undefined (shallow) so optional fields don't trip validation
function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}

// Unified schema: XOR between projectPath and workspacePath, sharing common options
const baseOptions = {
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
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const testSimulatorIdSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type TestSimulatorIdParams = z.infer<typeof testSimulatorIdSchema>;

export async function test_simulator_idLogic(
  params: TestSimulatorIdParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  return handleTestLogic(
    {
      ...(params.projectPath
        ? { projectPath: params.projectPath }
        : { workspacePath: params.workspacePath }),
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
  name: 'test_simulator_id',
  description:
    'Runs tests for either a project or workspace on a simulator by UUID using xcodebuild test and parses xcresult output. Provide exactly one of projectPath or workspacePath. Example: test_simulator_id({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorId: "SIMULATOR_UUID" })',
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<TestSimulatorIdParams>(
    testSimulatorIdSchema as unknown as z.ZodType<TestSimulatorIdParams>,
    test_simulator_idLogic,
    getDefaultCommandExecutor,
  ),
};
