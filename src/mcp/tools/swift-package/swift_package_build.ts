import { z } from 'zod';
import path from 'node:path';
import { createErrorResponse } from '../../../utils/responses/index.js';
import { log } from '../../../utils/logging/index.js';
import type { CommandExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const swiftPackageBuildSchema = z.object({
  packagePath: z.string().describe('Path to the Swift package root (Required)'),
  targetName: z.string().optional().describe('Optional target to build'),
  configuration: z
    .enum(['debug', 'release'])
    .optional()
    .describe('Swift package configuration (debug, release)'),
  architectures: z.array(z.string()).optional().describe('Target architectures to build for'),
  parseAsLibrary: z.boolean().optional().describe('Build as library instead of executable'),
});

// Use z.infer for type safety
type SwiftPackageBuildParams = z.infer<typeof swiftPackageBuildSchema>;

export async function swift_package_buildLogic(
  params: SwiftPackageBuildParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const resolvedPath = path.resolve(params.packagePath);
  const swiftArgs = ['build', '--package-path', resolvedPath];

  if (params.configuration && params.configuration.toLowerCase() === 'release') {
    swiftArgs.push('-c', 'release');
  }

  if (params.targetName) {
    swiftArgs.push('--target', params.targetName);
  }

  if (params.architectures) {
    for (const arch of params.architectures) {
      swiftArgs.push('--arch', arch);
    }
  }

  if (params.parseAsLibrary) {
    swiftArgs.push('-Xswiftc', '-parse-as-library');
  }

  log('info', `Running swift ${swiftArgs.join(' ')}`);
  try {
    const result = await executor(['swift', ...swiftArgs], 'Swift Package Build', true, undefined);
    if (!result.success) {
      const errorMessage = result.error ?? result.output ?? 'Unknown error';
      return createErrorResponse('Swift package build failed', errorMessage);
    }

    return {
      content: [
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: result.output },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Swift package build failed: ${message}`);
    return createErrorResponse('Failed to execute swift build', message);
  }
}

export default {
  name: 'swift_package_build',
  description: 'Builds a Swift Package with swift build',
  schema: swiftPackageBuildSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    swiftPackageBuildSchema,
    swift_package_buildLogic,
    getDefaultCommandExecutor,
  ),
};
