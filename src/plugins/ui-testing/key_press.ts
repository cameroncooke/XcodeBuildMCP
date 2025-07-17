import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../utils/index.js';
import { executeCommand, CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../utils/index.js';

const LOG_PREFIX = '[AXe]';

export default {
  name: 'key_press',
  description:
    'Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    keyCode: z.number().int('HID keycode to press (0-255)').min(0).max(255),
    duration: z.number().min(0, 'Duration must be non-negative').optional(),
  },
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
    getAxePathFn?: () => string | null,
    getBundledAxeEnvironmentFn?: () => Record<string, string>,
  ): Promise<ToolResponse> {
    const params = args;
    const toolName = 'key_press';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
    const keyCodeValidation = validateRequiredParam('keyCode', params.keyCode);
    if (!keyCodeValidation.isValid) return keyCodeValidation.errorResponse;

    const { simulatorUuid, keyCode, duration } = params;
    const commandArgs = ['key', String(keyCode)];
    if (duration !== undefined) {
      commandArgs.push('--duration', String(duration));
    }

    log('info', `${LOG_PREFIX}/${toolName}: Starting key press ${keyCode} on ${simulatorUuid}`);

    try {
      await executeAxeCommand(
        commandArgs,
        simulatorUuid,
        'key',
        executor,
        getAxePathFn,
        getBundledAxeEnvironmentFn,
      );
      log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
      return {
        content: [{ type: 'text', text: `Key press (code: ${keyCode}) simulated successfully.` }],
      };
    } catch (error) {
      log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
      if (error instanceof DependencyError) {
        return createAxeNotAvailableResponse();
      } else if (error instanceof AxeError) {
        return createErrorResponse(
          `Failed to simulate key press (code: ${keyCode}): ${error.message}`,
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
