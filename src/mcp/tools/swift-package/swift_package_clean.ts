import { z } from 'zod';
import path from 'node:path';
import type { CommandExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { createErrorResponse } from '../../../utils/responses/index.js';
import { log } from '../../../utils/logging/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const swiftPackageCleanSchema = z.object({
  packagePath: z.string().describe('Path to the Swift package root (Required)'),
});

// Use z.infer for type safety
type SwiftPackageCleanParams = z.infer<typeof swiftPackageCleanSchema>;

export async function swift_package_cleanLogic(
  params: SwiftPackageCleanParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const resolvedPath = path.resolve(params.packagePath);
  const swiftArgs = ['package', '--package-path', resolvedPath, 'clean'];

  log('info', `Running swift ${swiftArgs.join(' ')}`);
  try {
    const result = await executor(['swift', ...swiftArgs], 'Swift Package Clean', true, undefined);
    if (!result.success) {
      const errorMessage = result.error ?? result.output ?? 'Unknown error';
      return createErrorResponse('Swift package clean failed', errorMessage);
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
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Swift package clean failed: ${message}`);
    return createErrorResponse('Failed to execute swift package clean', message);
  }
}

export default {
  name: 'swift_package_clean',
  description: 'Cleans Swift Package build artifacts and derived data',
  schema: swiftPackageCleanSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    swiftPackageCleanSchema,
    swift_package_cleanLogic,
    getDefaultCommandExecutor,
  ),
};
