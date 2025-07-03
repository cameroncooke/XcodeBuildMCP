import { z } from 'zod';
import path from 'node:path';
import { executeCommand } from '../../src/utils/command.js';
import { validateRequiredParam } from '../../src/utils/validation.js';
import { createErrorResponse } from '../../src/utils/errors.js';
import { log } from '../../src/utils/logger.js';

export default {
  name: 'swift_package_clean',
  description: 'Cleans Swift Package build artifacts and derived data',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
  },
  async handler(params) {
    const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
    if (!pkgValidation.isValid) return pkgValidation.errorResponse;

    const resolvedPath = path.resolve(params.packagePath);
    const args = ['package', '--package-path', resolvedPath, 'clean'];

    log('info', `Running swift ${args.join(' ')}`);
    try {
      const result = await executeCommand(['swift', ...args], 'Swift Package Clean');
      if (!result.success) {
        const errorMessage = result.error || result.output || 'Unknown error';
        return createErrorResponse('Swift package clean failed', errorMessage, 'CleanError');
      }

      return {
        content: [
          { type: 'text', text: '✅ Swift package cleaned successfully.' },
          {
            type: 'text',
            text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
          },
          { type: 'text', text: result.output || '(clean completed silently)' },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('error', `Swift package clean failed: ${message}`);
      return createErrorResponse('Failed to execute swift package clean', message, 'SystemError');
    }
  },
};