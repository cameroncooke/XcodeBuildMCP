/**
 * UI Testing Plugin: Long Press
 * 
 * Long press at specific coordinates for given duration (ms).
 * Use describe_ui for precise coordinates (don't guess from screenshots).
 */

import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { validateRequiredParam, createTextResponse } from '../../src/utils/validation.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../src/utils/errors.js';
import { executeCommand } from '../../src/utils/command.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../src/utils/axe-helpers.js';

const LOG_PREFIX = '[AXe]';

export default {
  name: 'long_press',
  description: 'Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don\'t guess from screenshots).',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    x: z.number().int('X coordinate for the long press'),
    y: z.number().int('Y coordinate for the long press'),
    duration: z.number().positive('Duration of the long press in milliseconds'),
  },
  async handler(params) {
    const toolName = 'long_press';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
    const xValidation = validateRequiredParam('x', params.x);
    if (!xValidation.isValid) return xValidation.errorResponse;
    const yValidation = validateRequiredParam('y', params.y);
    if (!yValidation.isValid) return yValidation.errorResponse;
    const durationValidation = validateRequiredParam('duration', params.duration);
    if (!durationValidation.isValid) return durationValidation.errorResponse;

    const { simulatorUuid, x, y, duration } = params;
    // AXe uses touch command with --down, --up, and --delay for long press
    const delayInSeconds = duration / 1000; // Convert ms to seconds
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
      `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}), ${duration}ms on ${simulatorUuid}`,
    );

    try {
      await executeAxeCommand(commandArgs, simulatorUuid, 'touch');
      log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

      const warning = getCoordinateWarning(simulatorUuid);
      const message = `Long press at (${x}, ${y}) for ${duration}ms simulated successfully.`;

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
          `Failed to simulate long press at (${x}, ${y}): ${error.message}`,
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

function recordDescribeUICall(simulatorUuid) {
  describeUITimestamps.set(simulatorUuid, {
    timestamp: Date.now(),
    simulatorUuid,
  });
}

function getCoordinateWarning(simulatorUuid) {
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
  commandArgs,
  simulatorUuid,
  commandName,
) {
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