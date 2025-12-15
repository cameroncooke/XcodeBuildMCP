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
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const keyPressSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
  keyCode: z.number().int('HID keycode to press (0-255)').min(0).max(255),
  duration: z.number().min(0, 'Duration must be non-negative').optional(),
});

// Use z.infer for type safety
type KeyPressParams = z.infer<typeof keyPressSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

export async function key_pressLogic(
  params: KeyPressParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
): Promise<ToolResponse> {
  const toolName = 'key_press';
  const { simulatorId, keyCode, duration } = params;
  const commandArgs = ['key', String(keyCode)];
  if (duration !== undefined) {
    commandArgs.push('--duration', String(duration));
  }

  log('info', `${LOG_PREFIX}/${toolName}: Starting key press ${keyCode} on ${simulatorId}`);

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'key', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);
    return createTextResponse(`Key press (code: ${keyCode}) simulated successfully.`);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to simulate key press (code: ${keyCode}): ${error.message}`,
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

const publicSchemaObject = keyPressSchema.omit({ simulatorId: true } as const).strict();

export default {
  name: 'key_press',
  description:
    'Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: keyPressSchema,
  }),
  handler: createSessionAwareTool<KeyPressParams>({
    internalSchema: keyPressSchema as unknown as z.ZodType<KeyPressParams>,
    logicFunction: (params: KeyPressParams, executor: CommandExecutor) =>
      key_pressLogic(params, executor, {
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
