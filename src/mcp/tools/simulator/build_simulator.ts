/**
 * Simulator Build Plugin: Build Simulator Name (Unified)
 *
 * Builds an app from a project or workspace for a specific simulator by name.
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
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
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
  simulatorId: z.string().optional().describe('UUID of the simulator (optional)'),
};

const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const buildSimulatorNameSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type BuildSimulatorNameParams = z.infer<typeof buildSimulatorNameSchema>;

// Internal logic for building Simulator apps.
async function _handleSimulatorBuildLogic(
  params: BuildSimulatorNameParams,
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

export async function build_simulator_nameLogic(
  params: BuildSimulatorNameParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Provide defaults
  const processedParams: BuildSimulatorNameParams = {
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
    preferXcodebuild: params.preferXcodebuild ?? false,
  };

  return _handleSimulatorBuildLogic(processedParams, executor);
}

export default {
  name: 'build_simulator_name',
  description:
    "Builds an app from a project or workspace for a specific simulator by name. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorName. Example: build_simulator_name({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = buildSimulatorNameSchema.parse(args);
      return await build_simulator_nameLogic(validatedParams, getDefaultCommandExecutor());
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
