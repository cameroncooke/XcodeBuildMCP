/**
 * Simulator Test Plugin: Test Simulator (Unified)
 *
 * Runs tests for a project or workspace on a simulator by UUID or name.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 * Accepts mutually exclusive `simulatorId` or `simulatorName`.
 */

import { z } from 'zod';
import { handleTestLogic, log } from '../../../utils/index.js';
import { XcodePlatform } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';

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

// Define base schema object with all fields
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to use (Required)'),
  simulatorId: z
    .string()
    .optional()
    .describe('UUID of the simulator to use (obtained from listSimulators)'),
  simulatorName: z.string().optional().describe("Name of the simulator to use (e.g., 'iPhone 16')"),
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

export async function test_simulatorLogic(
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
    },
    executor,
  );
}

export default {
  name: 'test_simulator',
  description:
    'Runs tests on a simulator by UUID or name using xcodebuild test and parses xcresult output. Works with both Xcode projects (.xcodeproj) and workspaces (.xcworkspace). IMPORTANT: Requires either projectPath or workspacePath, plus scheme and either simulatorId or simulatorName. Example: test_simulator({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorName: "iPhone 16" })',
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = testSimulatorSchema.parse(args);
      return await test_simulatorLogic(validatedParams, getDefaultCommandExecutor());
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
