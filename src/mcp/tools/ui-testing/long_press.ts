/**
 * UI Testing Plugin: Long Press
 *
 * Long press at specific coordinates for given duration (ms).
 * Use describe_ui for precise coordinates (don't guess from screenshots).
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import {
  createTextResponse,
  createErrorResponse,
  DependencyError,
  AxeError,
  SystemError,
} from '../../../utils/responses/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../../utils/axe/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const longPressSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
  x: z.number().int('X coordinate for the long press'),
  y: z.number().int('Y coordinate for the long press'),
  duration: z.number().positive('Duration of the long press in milliseconds'),
});

// Use z.infer for type safety
type LongPressParams = z.infer<typeof longPressSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

export async function long_pressLogic(
  params: LongPressParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
): Promise<ToolResponse> {
  const toolName = 'long_press';
  const { simulatorId, x, y, duration } = params;
  // AXe uses touch command with --down, --up, and --delay for long press
  const delayInSeconds = Number(duration) / 1000; // Convert ms to seconds
  const commandArgs = [
    'touch',
    '-x',
    String(x),
    '-y',
    String(y),
    '--down',
    '--up',
    '--delay',
    String(delayInSeconds),
  ];

  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}), ${duration}ms on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'touch', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);

    const warning = getCoordinateWarning(simulatorId);
    const message = `Long press at (${x}, ${y}) for ${duration}ms simulated successfully.`;

    if (warning) {
      return createTextResponse(`${message}\n\n${warning}`);
    }

    return createTextResponse(message);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to simulate long press at (${x}, ${y}): ${error.message}`,
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
  name: 'long_press',
  description:
    "Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don't guess from screenshots).",
  schema: longPressSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    longPressSchema,
    (params: LongPressParams, executor: CommandExecutor) => {
      return long_pressLogic(params, executor, {
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
