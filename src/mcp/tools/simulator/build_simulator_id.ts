/**
 * Simulator Build Plugin: Build Simulator ID (Unified)
 *
 * Builds an app from a project or workspace for a specific simulator by UUID.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
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
  simulatorName: z.string().optional().describe('Name of the simulator (optional)'),
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildSimulatorIdSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type BuildSimulatorIdParams = z.infer<typeof buildSimulatorIdSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildSimulatorIdParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<ToolResponse> {
  const projectType = params.projectPath ? 'project' : 'workspace';
  const filePath = params.projectPath ?? params.workspacePath;

  log(
    'info',
    `Starting iOS Simulator build for scheme ${params.scheme} from ${projectType}: ${filePath}`,
  );

  // Ensure configuration has a default value for SharedBuildParams compatibility
  const sharedBuildParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
  };

  return executeXcodeBuildCommand(
    sharedBuildParams,
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    params.preferXcodebuild ?? false,
    'build',
    executor,
  );
}

export async function build_simulator_idLogic(
  params: BuildSimulatorIdParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Provide defaults
  const processedParams: BuildSimulatorIdParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  return _handleSimulatorBuildLogic(processedParams, executor);
}

export default {
  name: 'build_simulator_id',
  description:
    "Builds an app from a project or workspace for a specific simulator by UUID. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorId. Example: build_simulator_id({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = buildSimulatorIdSchema.parse(args);
      return await build_simulator_idLogic(validatedParams, getDefaultCommandExecutor());
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
