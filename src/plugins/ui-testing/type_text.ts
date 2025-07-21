/**
 * UI Testing Plugin: Type Text
 *
 * Types text into the iOS Simulator using keyboard input.
 * Supports standard US keyboard characters.
 */

import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam, createTextResponse } from '../../utils/index.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../utils/index.js';

const LOG_PREFIX = '[AXe]';

interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

interface TypeTextParams {
  simulatorUuid: unknown;
  text: unknown;
}

export async function type_textLogic(
  params: TypeTextParams,
  executor: CommandExecutor,
  axeHelpers?: AxeHelpers,
): Promise<ToolResponse> {
  const toolName = 'type_text';
  const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;
  const textValidation = validateRequiredParam('text', params.text);
  if (!textValidation.isValid) return textValidation.errorResponse;

  const { simulatorUuid, text } = params;
  const commandArgs = ['type', text];

  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting type "${String(text).substring(0, 20)}..." on ${simulatorUuid}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorUuid as string, 'type', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
    return createTextResponse('Text typing simulated successfully.');
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to simulate text typing: ${error.message}`,
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
  name: 'type_text',
  description:
    'Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    text: z.string().min(1, 'Text cannot be empty'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return type_textLogic(args, getDefaultCommandExecutor());
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
  // Use provided helpers or defaults
  const helpers = axeHelpers || { getAxePath, getBundledAxeEnvironment };

  // Get the appropriate axe binary path
  const axeBinary = helpers.getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorUuid];

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
