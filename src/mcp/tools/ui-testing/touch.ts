/**
 * UI Testing Plugin: Touch
 *
 * Perform touch down/up events at specific coordinates.
 * Use describe_ui for precise coordinates (don't guess from screenshots).
 */

import { z } from 'zod';
import { log } from '../../../utils/logging/index.ts';
import { createTextResponse, createErrorResponse } from '../../../utils/responses/index.ts';
import { DependencyError, AxeError, SystemError } from '../../../utils/errors.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../../utils/axe-helpers.ts';
import { ToolResponse } from '../../../types/common.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const touchSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
  x: z.number().int('X coordinate must be an integer'),
  y: z.number().int('Y coordinate must be an integer'),
  down: z.boolean().optional(),
  up: z.boolean().optional(),
  delay: z.number().min(0, 'Delay must be non-negative').optional(),
});

// Use z.infer for type safety
type TouchParams = z.infer<typeof touchSchema>;

const publicSchemaObject = touchSchema.omit({ simulatorId: true } as const).strict();

interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

const LOG_PREFIX = '[AXe]';

export async function touchLogic(
  params: TouchParams,
  executor: CommandExecutor,
  axeHelpers?: AxeHelpers,
): Promise<ToolResponse> {
  const toolName = 'touch';

  // Params are already validated by createTypedTool - use directly
  const { simulatorId, x, y, down, up, delay } = params;

  // Validate that at least one of down or up is specified
  if (!down && !up) {
    return createErrorResponse('At least one of "down" or "up" must be true');
  }

  const commandArgs = ['touch', '-x', String(x), '-y', String(y)];
  if (down) {
    commandArgs.push('--down');
  }
  if (up) {
    commandArgs.push('--up');
  }
  if (delay !== undefined) {
    commandArgs.push('--delay', String(delay));
  }

  const actionText = down && up ? 'touch down+up' : down ? 'touch down' : 'touch up';
  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting ${actionText} at (${x}, ${y}) on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'touch', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);

    const warning = getCoordinateWarning(simulatorId);
    const message = `Touch event (${actionText}) at (${x}, ${y}) executed successfully.`;

    if (warning) {
      return createTextResponse(`${message}\n\n${warning}`);
    }

    return createTextResponse(message);
  } catch (error) {
    log(
      'error',
      `${LOG_PREFIX}/${toolName}: Failed - ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof DependencyError) {
      return createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to execute touch event: ${error.message}`,
        error.axeOutput,
      );
    } else if (error instanceof SystemError) {
      return createErrorResponse(
        `System error executing axe: ${error.message}`,
        error.originalError?.stack,
      );
    }
    return createErrorResponse(
      `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export default {
  name: 'touch',
  description:
    "Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don't guess from screenshots).",
  schema: publicSchemaObject.shape, // MCP SDK compatibility
  handler: createSessionAwareTool<TouchParams>({
    internalSchema: touchSchema as unknown as z.ZodType<TouchParams>,
    logicFunction: (params: TouchParams, executor: CommandExecutor) => touchLogic(params, executor),
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};

// Session tracking for describe_ui warnings
interface DescribeUISession {
  timestamp: number;
  simulatorId: string;
}

const describeUITimestamps = new Map<string, DescribeUISession>();
const DESCRIBE_UI_WARNING_TIMEOUT = 60000; // 60 seconds

function getCoordinateWarning(simulatorId: string): string | null {
  const session = describeUITimestamps.get(simulatorId);
  if (!session) {
    return 'Warning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.';
  }

  const timeSinceDescribe = Date.now() - session.timestamp;
  if (timeSinceDescribe > DESCRIBE_UI_WARNING_TIMEOUT) {
    const secondsAgo = Math.round(timeSinceDescribe / 1000);
    return `Warning: describe_ui was last called ${secondsAgo} seconds ago. Consider refreshing UI coordinates with describe_ui instead of using potentially stale coordinates.`;
  }

  return null;
}

// Helper function for executing axe commands (inlined from src/tools/axe/index.ts)
async function executeAxeCommand(
  commandArgs: string[],
  simulatorId: string,
  commandName: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  axeHelpers?: AxeHelpers,
): Promise<void> {
  // Use injected helpers or default to imported functions
  const helpers = axeHelpers ?? { getAxePath, getBundledAxeEnvironment };

  // Get the appropriate axe binary path
  const axeBinary = helpers.getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorId];

  // Construct the full command array with the axe binary as the first element
  const fullCommand = [axeBinary, ...fullArgs];

  try {
    // Determine environment variables for bundled AXe
    const axeEnv = axeBinary !== 'axe' ? helpers.getBundledAxeEnvironment() : undefined;

    const result = await executor(fullCommand, `${LOG_PREFIX}: ${commandName}`, false, axeEnv);

    if (!result.success) {
      throw new AxeError(
        `axe command '${commandName}' failed.`,
        commandName,
        result.error ?? result.output,
        simulatorId,
      );
    }

    // Check for stderr output in successful commands
    if (result.error) {
      log(
        'warn',
        `${LOG_PREFIX}: Command '${commandName}' produced stderr output but exited successfully. Output: ${result.error}`,
      );
    }

    // Function now returns void - the calling code creates its own response
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof AxeError) {
        throw error;
      }

      // Otherwise wrap it in a SystemError
      throw new SystemError(`Failed to execute axe command: ${error.message}`, error);
    }

    // For any other type of error
    throw new SystemError(`Failed to execute axe command: ${String(error)}`);
  }
}
