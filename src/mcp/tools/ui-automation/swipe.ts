/**
 * UI Testing Plugin: Swipe
 *
 * Swipe from one coordinate to another on iOS simulator with customizable duration and delta.
 */

import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createTextResponse, createErrorResponse } from '../../../utils/responses/index.ts';
import { DependencyError, AxeError, SystemError } from '../../../utils/errors.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultDebuggerManager } from '../../../utils/debugger/index.ts';
import type { DebuggerManager } from '../../../utils/debugger/debugger-manager.ts';
import { guardUiAutomationAgainstStoppedDebugger } from '../../../utils/debugger/ui-automation-guard.ts';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../../utils/axe-helpers.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import { getSnapshotUiWarning } from './shared/snapshot-ui-state.ts';

// Define schema as ZodObject
const swipeSchema = z.object({
  simulatorId: z.uuid({ message: 'Invalid Simulator UUID format' }),
  x1: z.number().int({ message: 'Start X coordinate' }),
  y1: z.number().int({ message: 'Start Y coordinate' }),
  x2: z.number().int({ message: 'End X coordinate' }),
  y2: z.number().int({ message: 'End Y coordinate' }),
  duration: z
    .number()
    .min(0, { message: 'Duration must be non-negative' })
    .optional()
    .describe('seconds'),
  delta: z.number().min(0, { message: 'Delta must be non-negative' }).optional(),
  preDelay: z
    .number()
    .min(0, { message: 'Pre-delay must be non-negative' })
    .optional()
    .describe('seconds'),
  postDelay: z
    .number()
    .min(0, { message: 'Post-delay must be non-negative' })
    .optional()
    .describe('seconds'),
});

// Use z.infer for type safety
export type SwipeParams = z.infer<typeof swipeSchema>;

const publicSchemaObject = z.strictObject(swipeSchema.omit({ simulatorId: true } as const).shape);

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

/**
 * Core swipe logic implementation
 */
export async function swipeLogic(
  params: SwipeParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
  debuggerManager: DebuggerManager = getDefaultDebuggerManager(),
): Promise<ToolResponse> {
  const toolName = 'swipe';

  const { simulatorId, x1, y1, x2, y2, duration, delta, preDelay, postDelay } = params;
  const guard = await guardUiAutomationAgainstStoppedDebugger({
    debugger: debuggerManager,
    simulatorId,
    toolName,
  });
  if (guard.blockedResponse) return guard.blockedResponse;

  const commandArgs = [
    'swipe',
    '--start-x',
    String(x1),
    '--start-y',
    String(y1),
    '--end-x',
    String(x2),
    '--end-y',
    String(y2),
  ];
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

  const optionsText = duration ? ` duration=${duration}s` : '';
  log(
    'info',
    `${LOG_PREFIX}/${toolName}: Starting swipe (${x1},${y1})->(${x2},${y2})${optionsText} on ${simulatorId}`,
  );

  try {
    await executeAxeCommand(commandArgs, simulatorId, 'swipe', executor, axeHelpers);
    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);

    const coordinateWarning = getSnapshotUiWarning(simulatorId);
    const message = `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})${optionsText} simulated successfully.`;
    const warnings = [guard.warningText, coordinateWarning].filter(Boolean).join('\n\n');

    if (warnings) {
      return createTextResponse(`${message}\n\n${warnings}`);
    }

    return createTextResponse(message);
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(`Failed to simulate swipe: ${error.message}`, error.axeOutput);
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
  name: 'swipe',
  description: 'Swipe between points.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: swipeSchema,
  }),
  annotations: {
    title: 'Swipe',
    destructiveHint: true,
  },
  cli: {
    daemonAffinity: 'preferred',
  },
  handler: createSessionAwareTool<SwipeParams>({
    internalSchema: swipeSchema as unknown as z.ZodType<SwipeParams>,
    logicFunction: (params: SwipeParams, executor: CommandExecutor) =>
      swipeLogic(params, executor, {
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
