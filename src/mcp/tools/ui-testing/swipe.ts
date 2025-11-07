/**
 * UI Testing Plugin: Swipe
 *
 * Swipe from one coordinate to another on iOS simulator with customizable duration and delta.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
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
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const swipeSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
  x1: z.number().int('Start X coordinate'),
  y1: z.number().int('Start Y coordinate'),
  x2: z.number().int('End X coordinate'),
  y2: z.number().int('End Y coordinate'),
  duration: z.number().min(0, 'Duration must be non-negative').optional(),
  delta: z.number().min(0, 'Delta must be non-negative').optional(),
  preDelay: z.number().min(0, 'Pre-delay must be non-negative').optional(),
  postDelay: z.number().min(0, 'Post-delay must be non-negative').optional(),
});

// Use z.infer for type safety
type SwipeParams = z.infer<typeof swipeSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

/**
 * Core swipe logic implementation
 */
export async function swipeLogic(
  params: SwipeParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
): Promise<ToolResponse> {
  const toolName = 'swipe';

  const { simulatorId, x1, y1, x2, y2, duration, delta, preDelay, postDelay } = params;
  const commandArgs = [
    'swipe',
    '--start-x',
    String(x1),
    '--start-y',
    String(y1),
    '--end-x',
    String(x2),
    '--end-y',
    String(y2),
  ];
  if (duration !== undefined) {
    commandArgs.push('--duration', String(duration));
  }
  if (delta !== undefined) {
    commandArgs.push('--delta', String(delta));
  }
  if (preDelay !== undefined) {
    commandArgs.push('--pre-delay', String(preDelay));
  }
  if (postDelay !== undefined) {
    commandArgs.push('--post-delay', String(postDelay));
  }

  const optionsText = duration ? ` duration=${duration}s` : '';
  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting swipe (${x1},${y1})->(${x2},${y2})${optionsText} on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'swipe', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);

    const warning = getCoordinateWarning(simulatorId);
    const message = `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})${optionsText} simulated successfully.`;

    if (warning) {
      return createTextResponse(`${message}\n\n${warning}`);
    }

    return createTextResponse(message);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(`Failed to simulate swipe: ${error.message}`, error.axeOutput);
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
  name: 'swipe',
  description:
    "Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.",
  schema: swipeSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    swipeSchema,
    (params: SwipeParams, executor: CommandExecutor) => {
      return swipeLogic(params, executor, {
        getAxePath,
        getBundledAxeEnvironment,
        createAxeNotAvailableResponse,
      });
    },
    getDefaultCommandExecutor,
  ),
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
  axeHelpers: AxeHelpers = { getAxePath, getBundledAxeEnvironment, createAxeNotAvailableResponse },
): Promise<void> {
  // Get the appropriate axe binary path
  const axeBinary = axeHelpers.getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorId];

  // Construct the full command array with the axe binary as the first element
  const fullCommand = [axeBinary, ...fullArgs];

  try {
    // Determine environment variables for bundled AXe
    const axeEnv = axeBinary !== 'axe' ? axeHelpers.getBundledAxeEnvironment() : undefined;

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
