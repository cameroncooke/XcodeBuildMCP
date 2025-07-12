import { z } from 'zod';
import path from 'node:path';
import { executeCommand } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { createErrorResponse } from '../../utils/index.js';
import { log } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

export default {
  name: 'swift_package_clean',
  description: 'Cleans Swift Package build artifacts and derived data',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    const params = args;
    const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
    if (!pkgValidation.isValid) return pkgValidation.errorResponse;

    const resolvedPath = path.resolve(params.packagePath);
    const swiftArgs = ['package', '--package-path', resolvedPath, 'clean'];

    log('info', `Running swift ${swiftArgs.join(' ')}`);
    try {
      const result = await executeCommand(['swift', ...swiftArgs], 'Swift Package Clean');
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
