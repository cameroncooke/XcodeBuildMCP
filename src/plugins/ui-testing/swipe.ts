/**
 * UI Testing Plugin: Swipe
 *
 * Swipe from one coordinate to another on iOS simulator with customizable duration and delta.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../utils/index.js';

const LOG_PREFIX = '[AXe]';

export default {
  name: 'swipe',
  description:
    "Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.",
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    x1: z.number().int('Start X coordinate'),
    y1: z.number().int('Start Y coordinate'),
    x2: z.number().int('End X coordinate'),
    y2: z.number().int('End Y coordinate'),
    duration: z.number().min(0, 'Duration must be non-negative').optional(),
    delta: z.number().min(0, 'Delta must be non-negative').optional(),
    preDelay: z.number().min(0, 'Pre-delay must be non-negative').optional(),
    postDelay: z.number().min(0, 'Post-delay must be non-negative').optional(),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    const toolName = 'swipe';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
    const x1Validation = validateRequiredParam('x1', params.x1);
    if (!x1Validation.isValid) return x1Validation.errorResponse;
    const y1Validation = validateRequiredParam('y1', params.y1);
    if (!y1Validation.isValid) return y1Validation.errorResponse;
    const x2Validation = validateRequiredParam('x2', params.x2);
    if (!x2Validation.isValid) return x2Validation.errorResponse;
    const y2Validation = validateRequiredParam('y2', params.y2);
    if (!y2Validation.isValid) return y2Validation.errorResponse;

    const { simulatorUuid, x1, y1, x2, y2, duration, delta, preDelay, postDelay } = params;
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
      `${LOG_PREFIX}/${toolName}: Starting swipe (${x1},${y1})->(${x2},${y2})${optionsText} on ${simulatorUuid}`,
    );

    try {
      await executeAxeCommand(commandArgs, simulatorUuid, 'swipe');
      log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

      const warning = getCoordinateWarning(simulatorUuid);
      const message = `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})${optionsText} simulated successfully.`;

      if (warning) {
        return createTextResponse(`${message}\n\n${warning}`);
      }

      return createTextResponse(message);
    } catch (error) {
      log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
      if (error instanceof DependencyError) {
        return createAxeNotAvailableResponse();
      } else if (error instanceof AxeError) {
        return createErrorResponse(
          `Failed to simulate swipe: ${error.message}`,
          error.axeOutput,
          error.name,
        );
      } else if (error instanceof SystemError) {
        return createErrorResponse(
          `System error executing axe: ${error.message}`,
          error.originalError?.stack,
          error.name,
        );
      }
      return createErrorResponse(
        `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        'UnexpectedError',
      );
    }
  },
};

// Session tracking for describe_ui warnings
// DescribeUISession: { timestamp: number, simulatorUuid: string }

const describeUITimestamps = new Map();
const DESCRIBE_UI_WARNING_TIMEOUT = 60000; // 60 seconds

function getCoordinateWarning(simulatorUuid: string): { type: string; text: string } {
  const session = describeUITimestamps.get(simulatorUuid);
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
  simulatorUuid: string,
  commandName: string,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Get the appropriate axe binary path
  const axeBinary = getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorUuid];

  // Construct the full command array with the axe binary as the first element
  const fullCommand = [axeBinary, ...fullArgs];

  try {
    // Determine environment variables for bundled AXe
    const axeEnv = axeBinary !== 'axe' ? getBundledAxeEnvironment() : undefined;

    const result = await executeCommand(
      fullCommand,
      `${LOG_PREFIX}: ${commandName}`,
      false,
      axeEnv,
    );

    if (!result.success) {
      throw new AxeError(
        `axe command '${commandName}' failed.`,
        commandName,
        result.error || result.output,
        simulatorUuid,
      );
    }

    // Check for stderr output in successful commands
    if (result.error) {
      log(
        'warn',
        `${LOG_PREFIX}: Command '${commandName}' produced stderr output but exited successfully. Output: ${result.error}`,
      );
    }

    return result.output.trim();
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
