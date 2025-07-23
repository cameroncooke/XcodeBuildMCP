import { z } from 'zod';
import path from 'node:path';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTextResponse, validateRequiredParam } from '../../../utils/index.js';
import { createErrorResponse } from '../../../utils/index.js';
import { log } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';

// Inlined schemas from src/tools/common/index.ts
const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe('Swift package configuration (debug, release)');

const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Add -parse-as-library flag for @main support (default: false)');

interface SwiftPackageTestParams {
  packagePath: unknown;
  testProduct?: unknown;
  filter?: unknown;
  configuration?: unknown;
  parallel?: unknown;
  showCodecov?: unknown;
  parseAsLibrary?: unknown;
}

export async function swift_package_testLogic(
  params: SwiftPackageTestParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
  if (!pkgValidation.isValid) return pkgValidation.errorResponse;

  const resolvedPath = path.resolve(params.packagePath as string);
  const swiftArgs = ['test', '--package-path', resolvedPath];

  if (params.configuration && (params.configuration as string).toLowerCase() === 'release') {
    swiftArgs.push('-c', 'release');
  } else if (params.configuration && (params.configuration as string).toLowerCase() !== 'debug') {
    return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
  }

  if (params.testProduct) {
    swiftArgs.push('--test-product', params.testProduct as string);
  }

  if (params.filter) {
    swiftArgs.push('--filter', params.filter as string);
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
      const errorMessage = result.error || result.output || 'Unknown error';
      return createErrorResponse('Swift package tests failed', errorMessage, 'TestError');
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
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Swift package test failed: ${message}`);
    return createErrorResponse('Failed to execute swift test', message, 'SystemError');
  }
}

export default {
  name: 'swift_package_test',
  description: 'Runs tests for a Swift Package with swift test',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    testProduct: z.string().optional().describe('Optional specific test product to run'),
    filter: z.string().optional().describe('Filter tests by name (regex pattern)'),
    configuration: swiftConfigurationSchema,
    parallel: z.boolean().optional().describe('Run tests in parallel (default: true)'),
    showCodecov: z.boolean().optional().describe('Show code coverage (default: false)'),
    parseAsLibrary: parseAsLibrarySchema,
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return swift_package_testLogic(args, getDefaultCommandExecutor());
  },
};
