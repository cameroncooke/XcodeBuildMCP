import * as z from 'zod';
import path from 'node:path';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTextResponse, createErrorResponse } from '../../../utils/responses/index.ts';
import { log } from '../../../utils/logging/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const swiftPackageTestSchema = z.object({
  packagePath: z.string().describe('Path to the Swift package root (Required)'),
  testProduct: z.string().optional().describe('Optional specific test product to run'),
  filter: z.string().optional().describe('Filter tests by name (regex pattern)'),
  configuration: z
    .enum(['debug', 'release'])
    .optional()
    .describe('Swift package configuration (debug, release)'),
  parallel: z.boolean().optional().describe('Run tests in parallel (default: true)'),
  showCodecov: z.boolean().optional().describe('Show code coverage (default: false)'),
  parseAsLibrary: z
    .boolean()
    .optional()
    .describe('Add -parse-as-library flag for @main support (default: false)'),
});

// Use z.infer for type safety
type SwiftPackageTestParams = z.infer<typeof swiftPackageTestSchema>;

export async function swift_package_testLogic(
  params: SwiftPackageTestParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const resolvedPath = path.resolve(params.packagePath);
  const swiftArgs = ['test', '--package-path', resolvedPath];

  if (params.configuration?.toLowerCase() === 'release') {
    swiftArgs.push('-c', 'release');
  } else if (params.configuration && params.configuration.toLowerCase() !== 'debug') {
    return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
  }

  if (params.testProduct) {
    swiftArgs.push('--test-product', params.testProduct);
  }

  if (params.filter) {
    swiftArgs.push('--filter', params.filter);
  }

  if (params.parallel === false) {
    swiftArgs.push('--no-parallel');
  }

  if (params.showCodecov) {
    swiftArgs.push('--show-code-coverage');
  }

  if (params.parseAsLibrary) {
    swiftArgs.push('-Xswiftc', '-parse-as-library');
  }

  log('info', `Running swift ${swiftArgs.join(' ')}`);
  try {
    const result = await executor(['swift', ...swiftArgs], 'Swift Package Test', true, undefined);
    if (!result.success) {
      const errorMessage = result.error ?? result.output ?? 'Unknown error';
      return createErrorResponse('Swift package tests failed', errorMessage);
    }

    return {
      content: [
        { type: 'text', text: '✅ Swift package tests completed.' },
        {
          type: 'text',
          text: '💡 Next: Execute your app with swift_package_run if tests passed',
        },
        { type: 'text', text: result.output },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Swift package test failed: ${message}`);
    return createErrorResponse('Failed to execute swift test', message);
  }
}

export default {
  name: 'swift_package_test',
  description: 'Runs tests for a Swift Package with swift test',
  schema: swiftPackageTestSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Swift Package Test',
    destructiveHint: true,
  },
  handler: createTypedTool(
    swiftPackageTestSchema,
    swift_package_testLogic,
    getDefaultCommandExecutor,
  ),
};
