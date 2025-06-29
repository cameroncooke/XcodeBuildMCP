import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import { registerTool, swiftConfigurationSchema, parseAsLibrarySchema } from '../common/index.js';
import { executeCommand } from '../../utils/command.js';
import { createTextResponse, validateRequiredParam } from '../../utils/validation.js';
import { ToolResponse } from '../../types/common.js';
import { createErrorResponse } from '../../utils/errors.js';
import { log } from '../../utils/logger.js';

// Extract tool name
export const testSwiftPackageToolName = 'swift_package_test';

// Extract tool description
export const testSwiftPackageToolDescription = 'Runs tests for a Swift Package with swift test';

// Extract tool schema
export const testSwiftPackageToolSchema = {
  packagePath: z.string().describe('Path to the Swift package root (Required)'),
  testProduct: z.string().optional().describe('Optional specific test product to run'),
  filter: z.string().optional().describe('Filter tests by name (regex pattern)'),
  configuration: swiftConfigurationSchema,
  parallel: z.boolean().optional().describe('Run tests in parallel (default: true)'),
  showCodecov: z.boolean().optional().describe('Show code coverage (default: false)'),
  parseAsLibrary: parseAsLibrarySchema,
};

// Extract tool handler
export async function testSwiftPackageToolHandler(params: {
  packagePath: string;
  testProduct?: string;
  filter?: string;
  configuration?: 'debug' | 'release';
  parallel?: boolean;
  showCodecov?: boolean;
  parseAsLibrary?: boolean;
}): Promise<ToolResponse> {
  const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
  if (!pkgValidation.isValid) return pkgValidation.errorResponse!;

  const resolvedPath = path.resolve(params.packagePath);
  const args: string[] = ['test', '--package-path', resolvedPath];

  if (params.configuration && params.configuration.toLowerCase() === 'release') {
    args.push('-c', 'release');
  } else if (params.configuration && params.configuration.toLowerCase() !== 'debug') {
    return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
  }

  if (params.testProduct) {
    args.push('--test-product', params.testProduct);
  }

  if (params.filter) {
    args.push('--filter', params.filter);
  }

  if (params.parallel === false) {
    args.push('--no-parallel');
  }

  if (params.showCodecov) {
    args.push('--show-code-coverage');
  }

  if (params.parseAsLibrary) {
    args.push('-Xswiftc', '-parse-as-library');
  }

  log('info', `Running swift ${args.join(' ')}`);
  try {
    const result = await executeCommand(['swift', ...args], 'Swift Package Test');
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

export function registerTestSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    testSwiftPackageToolName,
    testSwiftPackageToolDescription,
    testSwiftPackageToolSchema,
    testSwiftPackageToolHandler,
  );
}
