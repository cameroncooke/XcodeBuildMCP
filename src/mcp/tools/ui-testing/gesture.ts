/**
 * UI Testing Plugin: Gesture
 *
 * Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, scroll-left, scroll-right,
 * swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge.
 */

import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../../utils/index.js';
import {
  DependencyError,
  AxeError,
  SystemError,
  createErrorResponse,
} from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../../utils/index.js';

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

interface GestureParams {
  simulatorUuid: string;
  preset: string;
  screenWidth?: number;
  screenHeight?: number;
  duration?: number;
  delta?: number;
  preDelay?: number;
  postDelay?: number;
}

const LOG_PREFIX = '[AXe]';

export async function gestureLogic(
  params: GestureParams,
  executor: CommandExecutor,
  axeHelpers?: AxeHelpers,
): Promise<ToolResponse> {
  const toolName = 'gesture';
  const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
  const presetValidation = validateRequiredParam('preset', params.preset);
  if (!presetValidation.isValid) return presetValidation.errorResponse;

  const { simulatorUuid, preset, screenWidth, screenHeight, duration, delta, preDelay, postDelay } =
    params;
  const commandArgs = ['gesture', preset];

  if (screenWidth !== undefined) {
    commandArgs.push('--screen-width', String(screenWidth));
  }
  if (screenHeight !== undefined) {
    commandArgs.push('--screen-height', String(screenHeight));
  }
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

  log('info', `${LOG_PREFIX}/${toolName}: Starting gesture '${preset}' on ${simulatorUuid}`);

  try {
    await executeAxeCommand(commandArgs, simulatorUuid, 'gesture', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
    return createTextResponse(`Gesture '${preset}' executed successfully.`);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to execute gesture '${preset}': ${error.message}`,
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
}

export default {
  name: 'gesture',
  description:
    'Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    preset: z
      .enum([
        'scroll-up',
        'scroll-down',
        'scroll-left',
        'scroll-right',
        'swipe-from-left-edge',
        'swipe-from-right-edge',
        'swipe-from-top-edge',
        'swipe-from-bottom-edge',
      ])
      .describe(
        'The gesture preset to perform. Must be one of: scroll-up, scroll-down, scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge.',
      ),
    screenWidth: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Optional: Screen width in pixels. Used for gesture calculations. Auto-detected if not provided.',
      ),
    screenHeight: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Optional: Screen height in pixels. Used for gesture calculations. Auto-detected if not provided.',
      ),
    duration: z
      .number()
      .min(0, 'Duration must be non-negative')
      .optional()
      .describe('Optional: Duration of the gesture in seconds.'),
    delta: z
      .number()
      .min(0, 'Delta must be non-negative')
      .optional()
      .describe('Optional: Distance to move in pixels.'),
    preDelay: z
      .number()
      .min(0, 'Pre-delay must be non-negative')
      .optional()
      .describe('Optional: Delay before starting the gesture in seconds.'),
    postDelay: z
      .number()
      .min(0, 'Post-delay must be non-negative')
      .optional()
      .describe('Optional: Delay after completing the gesture in seconds.'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return gestureLogic(args as GestureParams, getDefaultCommandExecutor());
  },
};

// Helper function for executing axe commands (inlined from src/tools/axe/index.ts)
async function executeAxeCommand(
  commandArgs: string[],
  simulatorUuid: string,
  commandName: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  axeHelpers?: AxeHelpers,
): Promise<ToolResponse> {
  // Get the appropriate axe binary path
  const axeBinary = axeHelpers ? axeHelpers.getAxePath() : getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorUuid];

  // Construct the full command array with the axe binary as the first element
  const fullCommand = [axeBinary, ...fullArgs];

  try {
    // Determine environment variables for bundled AXe
    const axeEnv =
      axeBinary !== 'axe'
        ? axeHelpers
          ? axeHelpers.getBundledAxeEnvironment()
          : getBundledAxeEnvironment()
        : undefined;

    const result = await executor(fullCommand, `${LOG_PREFIX}: ${commandName}`, false, axeEnv);

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
