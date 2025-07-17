/**
 * UI Testing Plugin: Key Sequence
 *
 * Press key sequence using HID keycodes on iOS simulator with configurable delay.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../utils/index.js';
import { executeCommand, CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../utils/index.js';

const LOG_PREFIX = '[AXe]';

export default {
  name: 'key_sequence',
  description: 'Press key sequence using HID keycodes on iOS simulator with configurable delay',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    keyCodes: z.array(z.number().int().min(0).max(255)).min(1, 'At least one keycode required'),
    delay: z.number().min(0, 'Delay must be non-negative').optional(),
  },
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
    getAxePathFn?: () => string | null,
    getBundledAxeEnvironmentFn?: () => Record<string, string>,
  ): Promise<ToolResponse> {
    const params = args;
    const toolName = 'key_sequence';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
    const keyCodesValidation = validateRequiredParam('keyCodes', params.keyCodes);
    if (!keyCodesValidation.isValid) return keyCodesValidation.errorResponse;

    const { simulatorUuid, keyCodes, delay } = params;
    const commandArgs = ['key-sequence', '--keycodes', keyCodes.join(',')];
    if (delay !== undefined) {
      commandArgs.push('--delay', String(delay));
    }

    log(
      'info',
      `${LOG_PREFIX}/${toolName}: Starting key sequence [${keyCodes.join(',')}] on ${simulatorUuid}`,
    );

    try {
      await executeAxeCommand(
        commandArgs,
        simulatorUuid,
        'key-sequence',
        executor,
        getAxePathFn,
        getBundledAxeEnvironmentFn,
      );
      log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
      return createTextResponse(`Key sequence [${keyCodes.join(',')}] executed successfully.`);
    } catch (error) {
      log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
      if (error instanceof DependencyError) {
        return createAxeNotAvailableResponse();
      } else if (error instanceof AxeError) {
        return createErrorResponse(
          `Failed to execute key sequence: ${error.message}`,
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
  executor: CommandExecutor = getDefaultCommandExecutor(),
  getAxePathFn?: () => string | null,
  getBundledAxeEnvironmentFn?: () => Record<string, string>,
): Promise<ToolResponse> {
  // Get the appropriate axe binary path
  const axeBinary = getAxePathFn ? getAxePathFn() : getAxePath();
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
        ? getBundledAxeEnvironmentFn
          ? getBundledAxeEnvironmentFn()
          : getBundledAxeEnvironment()
        : undefined;

    const result = await executeCommand(
      fullCommand,
      executor,
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
