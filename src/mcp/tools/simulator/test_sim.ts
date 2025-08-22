/**
 * Simulator Test Plugin: Test Simulator (Unified)
 *
 * Runs tests for a project or workspace on a simulator by UUID or name.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 * Accepts mutually exclusive `simulatorId` or `simulatorName`.
 */

import { z } from 'zod';
import { handleTestLogic } from '../../../utils/test/index.ts';
import { log } from '../../../utils/logging/index.ts';
import { XcodePlatform } from '../../../types/common.ts';
import { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Define base schema object with all fields
const baseSchemaObject = z.object({
  projectPath: z
    .string()
    .optional()
    .describe('Path to .xcodeproj file. Provide EITHER this OR workspacePath, not both'),
  workspacePath: z
    .string()
    .optional()
    .describe('Path to .xcworkspace file. Provide EITHER this OR projectPath, not both'),
  scheme: z.string().describe('The scheme to use (Required)'),
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
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
  testRunnerEnv: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Environment variables to pass to the test runner (TEST_RUNNER_ prefix added automatically)',
    ),
});

// Apply preprocessor to handle empty strings
const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

// Apply XOR validation: exactly one of projectPath OR workspacePath, and exactly one of simulatorId OR simulatorName required
const testSimulatorSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

// Use z.infer for type safety
type TestSimulatorParams = z.infer<typeof testSimulatorSchema>;

export async function test_simLogic(
  params: TestSimulatorParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Log warning if useLatestOS is provided with simulatorId
  if (params.simulatorId && params.useLatestOS !== undefined) {
    log(
      'warning',
      `useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)`,
    );
  }

  return handleTestLogic(
    {
      projectPath: params.projectPath,
      workspacePath: params.workspacePath,
      scheme: params.scheme,
      simulatorId: params.simulatorId,
      simulatorName: params.simulatorName,
      configuration: params.configuration ?? 'Debug',
      derivedDataPath: params.derivedDataPath,
      extraArgs: params.extraArgs,
      useLatestOS: params.simulatorId ? false : (params.useLatestOS ?? false),
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.iOSSimulator,
      testRunnerEnv: params.testRunnerEnv,
    },
    executor,
  );
}

export default {
  name: 'test_sim',
  description:
    'Runs tests on a simulator by UUID or name using xcodebuild test and parses xcresult output. Works with both Xcode projects (.xcodeproj) and workspaces (.xcworkspace). IMPORTANT: Requires either projectPath or workspacePath, plus scheme and either simulatorId or simulatorName. Example: test_sim({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorName: "iPhone 16" })',
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = testSimulatorSchema.parse(args);
      return await test_simLogic(validatedParams, getDefaultCommandExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors in a user-friendly way
        const errorMessages = error.errors.map((e) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}` : 'root';
          return `${path}: ${e.message}`;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Parameter validation failed. Invalid parameters:\n${errorMessages.join('\n')}`,
            },
          ],
          isError: true,
        };
      }

      // Re-throw unexpected errors
      throw error;
    }
  },
};
