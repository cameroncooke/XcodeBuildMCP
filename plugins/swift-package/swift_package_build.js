import { z } from 'zod';
import path from 'node:path';
import { executeCommand } from '../../build/utils.js';
import { validateRequiredParam } from '../../build/utils.js';
import { createErrorResponse } from '../../build/utils.js';
import { log } from '../../build/utils.js';

// Inlined schemas from src/tools/common/index.ts
const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe("Swift package configuration (debug, release)");

const swiftArchitecturesSchema = z
  .array(z.string())
  .optional()
  .describe('Target architectures to build for');

const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Build as library instead of executable');

export default {
  name: 'swift_package_build',
  description: 'Builds a Swift Package with swift build',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    targetName: z.string().optional().describe('Optional target to build'),
    configuration: swiftConfigurationSchema,
    architectures: swiftArchitecturesSchema,
    parseAsLibrary: parseAsLibrarySchema,
  },
  async handler(params) {
    const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
    if (!pkgValidation.isValid) return pkgValidation.errorResponse;

    const resolvedPath = path.resolve(params.packagePath);
    const args = ['build', '--package-path', resolvedPath];

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
}; 