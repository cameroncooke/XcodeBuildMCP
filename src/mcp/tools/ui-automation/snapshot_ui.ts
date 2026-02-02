import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';
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
import { recordSnapshotUiCall } from './shared/snapshot-ui-state.ts';

// Define schema as ZodObject
const snapshotUiSchema = z.object({
  simulatorId: z.uuid({ message: 'Invalid Simulator UUID format' }),
});

// Use z.infer for type safety
type SnapshotUiParams = z.infer<typeof snapshotUiSchema>;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
  createAxeNotAvailableResponse: () => ToolResponse;
}

const LOG_PREFIX = '[AXe]';

/**
 * Core business logic for snapshot_ui functionality
 */
export async function snapshot_uiLogic(
  params: SnapshotUiParams,
  executor: CommandExecutor,
  axeHelpers: AxeHelpers = {
    getAxePath,
    getBundledAxeEnvironment,
    createAxeNotAvailableResponse,
  },
  debuggerManager: DebuggerManager = getDefaultDebuggerManager(),
): Promise<ToolResponse> {
  const toolName = 'snapshot_ui';
  const { simulatorId } = params;
  const commandArgs = ['describe-ui'];

  const guard = await guardUiAutomationAgainstStoppedDebugger({
    debugger: debuggerManager,
    simulatorId,
    toolName,
  });
  if (guard.blockedResponse) return guard.blockedResponse;

  log('info', `${LOG_PREFIX}/${toolName}: Starting for ${simulatorId}`);

  try {
    const responseText = await executeAxeCommand(
      commandArgs,
      simulatorId,
      'describe-ui',
      executor,
      axeHelpers,
    );

    // Record the snapshot_ui call for warning system
    recordSnapshotUiCall(simulatorId);

    log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorId}`);
    const response: ToolResponse = {
      content: [
        {
          type: 'text',
          text:
            'Accessibility hierarchy retrieved successfully:\n```json\n' + responseText + '\n```',
        },
        {
          type: 'text',
          text: `Tips:\n- Use frame coordinates for tap/swipe (center: x+width/2, y+height/2)\n- If a debugger is attached, ensure the app is running (not stopped on breakpoints)\n- Screenshots are for visual verification only`,
        },
      ],
      nextSteps: [
        {
          tool: 'snapshot_ui',
          label: 'Refresh after layout changes',
          params: { simulatorId },
          priority: 1,
        },
        {
          tool: 'tap_coordinate',
          label: 'Tap on element',
          params: { simulatorId, x: 0, y: 0 },
          priority: 2,
        },
        {
          tool: 'take_screenshot',
          label: 'Take screenshot for verification',
          params: { simulatorId },
          priority: 3,
        },
      ],
    };
    if (guard.warningText) {
      response.content.push({ type: 'text', text: guard.warningText });
    }
    return response;
  } catch (error) {
    log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
    if (error instanceof DependencyError) {
      return axeHelpers.createAxeNotAvailableResponse();
    } else if (error instanceof AxeError) {
      return createErrorResponse(
        `Failed to get accessibility hierarchy: ${error.message}`,
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

const publicSchemaObject = z.strictObject(
  snapshotUiSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'snapshot_ui',
  description:
    'Print view hierarchy with precise view coordinates (x, y, width, height) for visible elements.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: snapshotUiSchema,
  }),
  annotations: {
    title: 'Snapshot UI',
    readOnlyHint: true,
  },
  cli: {
    daemonAffinity: 'preferred',
  },
  handler: createSessionAwareTool<SnapshotUiParams>({
    internalSchema: snapshotUiSchema as unknown as z.ZodType<SnapshotUiParams, unknown>,
    logicFunction: (params: SnapshotUiParams, executor: CommandExecutor) =>
      snapshot_uiLogic(params, executor, {
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
): Promise<string> {
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
