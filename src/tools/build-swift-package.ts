import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import {
  registerTool,
  swiftConfigurationSchema,
  swiftArchitecturesSchema,
  parseAsLibrarySchema,
} from './common.js';
import { executeCommand } from '../utils/command.js';
import { validateRequiredParam } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { createErrorResponse } from '../utils/errors.js';
import { log } from '../utils/logger.js';

export function registerBuildSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    'swift_package_build',
    'Builds a Swift Package with swift build',
    {
      packagePath: z.string().describe('Path to the Swift package root (Required)'),
      targetName: z.string().optional().describe('Optional target to build'),
      configuration: swiftConfigurationSchema,
      architectures: swiftArchitecturesSchema,
      parseAsLibrary: parseAsLibrarySchema,
    },
    async (params: {
      packagePath: string;
      targetName?: string;
      configuration?: 'debug' | 'release';
      architectures?: ('arm64' | 'x86_64')[];
      parseAsLibrary?: boolean;
    }): Promise<ToolResponse> => {
      const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
      if (!pkgValidation.isValid) return pkgValidation.errorResponse!;

      const resolvedPath = path.resolve(params.packagePath);
      const args: string[] = ['build', '--package-path', resolvedPath];

      if (params.configuration && params.configuration.toLowerCase() === 'release') {
        args.push('-c', 'release');
      }

      if (params.targetName) {
        args.push('--target', params.targetName);
      }

      if (params.architectures) {
        for (const arch of params.architectures) {
          args.push('--arch', arch);
        }
      }

      if (params.parseAsLibrary) {
        args.push('-Xswiftc', '-parse-as-library');
      }

      log('info', `Running swift ${args.join(' ')}`);
      try {
        const result = await executeCommand(['swift', ...args], 'Swift Package Build');
        if (!result.success) {
          const errorMessage = result.error || result.output || 'Unknown error';
          return createErrorResponse('Swift package build failed', errorMessage, 'BuildError');
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
        return createErrorResponse('Failed to execute swift build', message, 'SystemError');
      }
    },
  );
}
