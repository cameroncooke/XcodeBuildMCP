/**
 * UI Testing Plugin: Type Text
 *
 * Types text into the iOS Simulator using keyboard input.
 * Supports standard US keyboard characters.
 */

import * as z from 'zod';
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
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const LOG_PREFIX = '[AXe]';

// Define schema as ZodObject
const typeTextSchema = z.object({
  simulatorId: z.uuid({ message: 'Invalid Simulator UUID format' }),
  text: z.string().min(1, { message: 'Text cannot be empty' }),
});

// Use z.infer for type safety
type TypeTextParams = z.infer<typeof typeTextSchema>;

const publicSchemaObject = z.strictObject(
  typeTextSchema.omit({ simulatorId: true } as const).shape,
);

interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

export async function type_textLogic(
  params: TypeTextParams,
  executor: CommandExecutor,
  axeHelpers?: AxeHelpers,
): Promise<ToolResponse> {
  const toolName = 'type_text';

  // Params are already validated by the factory, use directly
  const { simulatorId, text } = params;
  const commandArgs = ['type', text];

  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting type "${text.substring(0, 20)}..." on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'type', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);
    return createTextResponse('Text typing simulated successfully.');
  } catch (error) {
    log(
      'error',
      `${LOG_PREFIX}/${toolName}: Failed - ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof DependencyError) {
      return createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to simulate text typing: ${error.message}`,
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
  name: 'type_text',
  description:
    'Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: typeTextSchema,
  }),
  annotations: {
    title: 'Type Text',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<TypeTextParams>({
    internalSchema: typeTextSchema as unknown as z.ZodType<TypeTextParams, unknown>,
    logicFunction: (params: TypeTextParams, executor: CommandExecutor) =>
      type_textLogic(params, executor),
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }), // Safe factory
};

// Helper function for executing axe commands (inlined from src/tools/axe/index.ts)
async function executeAxeCommand(
  commandArgs: string[],
  simulatorId: string,
  commandName: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  axeHelpers?: AxeHelpers,
): Promise<void> {
  // Use provided helpers or defaults
  const helpers = axeHelpers ?? { getAxePath, getBundledAxeEnvironment };

  // Get the appropriate axe binary path
  const axeBinary = helpers.getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorId];

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
