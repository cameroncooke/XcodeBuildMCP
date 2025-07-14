/**
 * Hardware Button Plugin
 *
 * Press hardware buttons on iOS simulator including apple-pay, home, lock, side-button, and siri.
 * Supports optional duration parameter for extended button presses.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../utils/index.js';
import { executeCommand, CommandExecutor } from '../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../utils/index.js';

interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

const LOG_PREFIX = '[AXe]';

export default {
  name: 'button',
  description:
    'Press hardware button on iOS simulator. Supported buttons: apple-pay, home, lock, side-button, siri',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    buttonType: z.enum(['apple-pay', 'home', 'lock', 'side-button', 'siri']),
    duration: z.number().min(0, 'Duration must be non-negative').optional(),
  },
  async handler(
    args: Record<string, unknown>,
    executor?: CommandExecutor,
    axeHelpers?: AxeHelpers,
  ): Promise<ToolResponse> {
    const params = args;
    const toolName = 'button';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
    const buttonTypeValidation = validateRequiredParam('buttonType', params.buttonType);
    if (!buttonTypeValidation.isValid) return buttonTypeValidation.errorResponse;

    const { simulatorUuid, buttonType, duration } = params;
    const commandArgs = ['button', buttonType];
    if (duration !== undefined) {
      commandArgs.push('--duration', String(duration));
    }

    log(
      'info',
      `${LOG_PREFIX}/${toolName}: Starting ${buttonType} button press on ${simulatorUuid}`,
    );

    try {
      await executeAxeCommand(commandArgs, simulatorUuid, 'button', executor, axeHelpers);
      log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
      return {
        content: [{ type: 'text', text: `Hardware button '${buttonType}' pressed successfully.` }],
      };
    } catch (error) {
      log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
      if (error instanceof DependencyError) {
        return createAxeNotAvailableResponse();
      } else if (error instanceof AxeError) {
        return createErrorResponse(
          `Failed to press button '${buttonType}': ${error.message}`,
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

// Helper function for executing axe commands (inlined from src/tools/axe/index.ts)
async function executeAxeCommand(
  commandArgs: string[],
  simulatorUuid: string,
  commandName: string,
  executor?: CommandExecutor,
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

    const result = executor
      ? await executor(fullCommand, `${LOG_PREFIX}: ${commandName}`, false, axeEnv)
      : await executeCommand(fullCommand, `${LOG_PREFIX}: ${commandName}`, false, axeEnv);

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
