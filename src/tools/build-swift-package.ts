import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import { registerTool } from './common.js';
import { executeCommand } from '../utils/command.js';
import { createTextResponse, validateRequiredParam } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { createErrorResponse } from '../utils/errors.js';
import { log } from '../utils/logger.js';

// Parameter schemas
const configurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe("Build configuration: 'debug' (default) or 'release'");

const archSchema = z
  .enum(['arm64', 'x86_64'])
  .array()
  .optional()
  .describe('Architectures to build for (e.g. arm64, x86_64)');

export function registerBuildSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    'build_swift_package',
    'Builds a Swift Package with swift build',
    {
      packagePath: z.string().describe('Path to the Swift package root (Required)'),
      targetName: z.string().optional().describe('Optional target to build'),
      configuration: configurationSchema,
      archs: archSchema,
    },
    async (params: {
      packagePath: string;
      targetName?: string;
      configuration?: 'debug' | 'release';
      archs?: ('arm64' | 'x86_64')[];
    }): Promise<ToolResponse> => {
      const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
      if (!pkgValidation.isValid) return pkgValidation.errorResponse!;

      const resolvedPath = path.resolve(params.packagePath);
      const args: string[] = ['build', '--package-path', resolvedPath];

      if (params.configuration && params.configuration.toLowerCase() === 'release') {
        args.push('-c', 'release');
      } else if (params.configuration && params.configuration.toLowerCase() !== 'debug') {
        return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
      }

      if (params.targetName) {
        args.push('--target', params.targetName);
      }

      if (params.archs) {
        for (const arch of params.archs) {
          args.push('--arch', arch);
        }
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
            { type: 'text', text: result.output },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log('error', `Swift package build failed: ${message}`);
        return createErrorResponse('Failed to execute swift build', message, 'SystemError');
      }
    },
  );
}
