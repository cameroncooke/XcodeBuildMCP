/**
 * UI Testing Plugin: Key Sequence
 *
 * Press key sequence using HID keycodes on iOS simulator with configurable delay.
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
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const keySequenceSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
  keyCodes: z.array(z.number().int().min(0).max(255)).min(1, 'At least one key code required'),
  delay: z.number().min(0, 'Delay must be non-negative').optional(),
});

// Use z.infer for type safety
type KeySequenceParams = z.infer<typeof keySequenceSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

export async function key_sequenceLogic(
  params: KeySequenceParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
): Promise<ToolResponse> {
  const toolName = 'key_sequence';
  const { simulatorId, keyCodes, delay } = params;
  const commandArgs = ['key-sequence', '--keycodes', keyCodes.join(',')];
  if (delay !== undefined) {
    commandArgs.push('--delay', String(delay));
  }

  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting key sequence [${keyCodes.join(',')}] on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'key-sequence', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);
    return createTextResponse(`Key sequence [${keyCodes.join(',')}] executed successfully.`);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to execute key sequence: ${error.message}`,
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

const publicSchemaObject = keySequenceSchema.omit({ simulatorId: true } as const).strict();

export default {
  name: 'key_sequence',
  description: 'Press key sequence using HID keycodes on iOS simulator with configurable delay',
  schema: publicSchemaObject.shape, // MCP SDK compatibility
  handler: createSessionAwareTool<KeySequenceParams>({
    internalSchema: keySequenceSchema as unknown as z.ZodType<KeySequenceParams>,
    logicFunction: (params: KeySequenceParams, executor: CommandExecutor) =>
      key_sequenceLogic(params, executor, {
        getAxePath,
        getBundledAxeEnvironment,
        createAxeNotAvailableResponse,
      }),
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};

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
