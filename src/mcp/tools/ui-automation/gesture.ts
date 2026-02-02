/**
 * UI Testing Plugin: Gesture
 *
 * Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, scroll-left, scroll-right,
 * swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge.
 */

import * as z from 'zod';
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
import { getDefaultDebuggerManager } from '../../../utils/debugger/index.ts';
import type { DebuggerManager } from '../../../utils/debugger/debugger-manager.ts';
import { guardUiAutomationAgainstStoppedDebugger } from '../../../utils/debugger/ui-automation-guard.ts';
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
const gestureSchema = z.object({
  simulatorId: z.uuid({ message: 'Invalid Simulator UUID format' }),
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
      'scroll-up|scroll-down|scroll-left|scroll-right|swipe-from-left-edge|swipe-from-right-edge|swipe-from-top-edge|swipe-from-bottom-edge',
    ),
  screenWidth: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Screen width in pixels. Used for gesture calculations. Auto-detected if not provided.',
    ),
  screenHeight: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Screen height in pixels. Used for gesture calculations. Auto-detected if not provided.',
    ),
  duration: z
    .number()
    .min(0, { message: 'Duration must be non-negative' })
    .optional()
    .describe('Duration of the gesture in seconds.'),
  delta: z
    .number()
    .min(0, { message: 'Delta must be non-negative' })
    .optional()
    .describe('Distance to move in pixels.'),
  preDelay: z
    .number()
    .min(0, { message: 'Pre-delay must be non-negative' })
    .optional()
    .describe('Delay before starting the gesture in seconds.'),
  postDelay: z
    .number()
    .min(0, { message: 'Post-delay must be non-negative' })
    .optional()
    .describe('Delay after completing the gesture in seconds.'),
});

// Use z.infer for type safety
type GestureParams = z.infer<typeof gestureSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

export async function gestureLogic(
  params: GestureParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
  debuggerManager: DebuggerManager = getDefaultDebuggerManager(),
): Promise<ToolResponse> {
  const toolName = 'gesture';
  const { simulatorId, preset, screenWidth, screenHeight, duration, delta, preDelay, postDelay } =
    params;
  const guard = await guardUiAutomationAgainstStoppedDebugger({
    debugger: debuggerManager,
    simulatorId,
    toolName,
  });
  if (guard.blockedResponse) return guard.blockedResponse;
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

  log('info', `${LOG_PREFIX}/${toolName}: Starting gesture '${preset}' on ${simulatorId}`);

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'gesture', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);
    const message = `Gesture '${preset}' executed successfully.`;
    if (guard.warningText) {
      return createTextResponse(`${message}\n\n${guard.warningText}`);
    }
    return createTextResponse(message);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to execute gesture '${preset}': ${error.message}`,
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

const publicSchemaObject = z.strictObject(gestureSchema.omit({ simulatorId: true } as const).shape);

export default {
  name: 'gesture',
  description: 'Simulator gesture preset.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: gestureSchema,
  }),
  annotations: {
    title: 'Gesture',
    destructiveHint: true,
  },
  cli: {
    daemonAffinity: 'preferred',
  },
  handler: createSessionAwareTool<GestureParams>({
    internalSchema: gestureSchema as unknown as z.ZodType<GestureParams, unknown>,
    logicFunction: (params: GestureParams, executor: CommandExecutor) =>
      gestureLogic(params, executor, {
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

    const result = await executor(
      fullCommand,
      `${LOG_PREFIX}: ${commandName}`,
      false,
      axeEnv ? { env: axeEnv } : undefined,
    );

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
