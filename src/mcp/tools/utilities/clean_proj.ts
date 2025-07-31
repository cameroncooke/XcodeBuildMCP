/**
 * Utilities Plugin: Clean Project
 *
 * Cleans build products and intermediate files from a project.
 */

import { z } from 'zod';
import {
  log,
  XcodePlatform,
  executeXcodeBuildCommand,
  validateRequiredParam,
  CommandExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const cleanProjSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
  scheme: z.string().optional().describe('The scheme to clean'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe(
      'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
    ),
});

// Use z.infer for type safety
type CleanProjParams = z.infer<typeof cleanProjSchema>;

// Exported business logic function for clean project
export async function clean_projLogic(
  params: CleanProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Params are already validated, use directly
  const validated = params;

  const projectPathValidation = validateRequiredParam('projectPath', validated.projectPath);
  if (!projectPathValidation.isValid) {
    return projectPathValidation.errorResponse!;
  }

  log('info', 'Starting xcodebuild clean request');

  // For clean operations, we need to provide a default platform and configuration
  return executeXcodeBuildCommand(
    {
      ...validated,
      scheme: validated.scheme ?? '', // Empty string if not provided
      configuration: validated.configuration ?? 'Debug', // Default to Debug if not provided
    },
    {
      platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
      logPrefix: 'Clean',
    },
    false,
    'clean', // Specify 'clean' as the build action
    executor,
  );
}

export default {
  name: 'clean_proj',
  description:
    "Cleans build products and intermediate files from a project. IMPORTANT: Requires projectPath. Example: clean_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
  schema: cleanProjSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(cleanProjSchema, clean_projLogic, getDefaultCommandExecutor),
};
