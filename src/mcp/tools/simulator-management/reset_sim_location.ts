import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const resetSimulatorLocationSchema = z.object({
  simulatorId: z.uuid().describe('UUID of the simulator to use (obtained from list_simulators)'),
});

// Use z.infer for type safety
type ResetSimulatorLocationParams = z.infer<typeof resetSimulatorLocationSchema>;

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: ResetSimulatorLocationParams,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  executor: CommandExecutor,
  extraValidation?: () => ToolResponse | undefined,
): Promise<ToolResponse> {
  if (extraValidation) {
    const validationResult = extraValidation();
    if (validationResult) {
      return validationResult;
    }
  }

  try {
    const command = ['xcrun', 'simctl', ...simctlSubCommand];
    const result = await executor(command, operationDescriptionForXcodeCommand, false, {});

    if (!result.success) {
      const fullFailureMessage = `${failureMessagePrefix}: ${result.error}`;
      log(
        'error',
        `${fullFailureMessage} (operation: ${operationLogContext}, simulator: ${params.simulatorId})`,
      );
      return {
        content: [{ type: 'text', text: fullFailureMessage }],
      };
    }

    log(
      'info',
      `${successMessage} (operation: ${operationLogContext}, simulator: ${params.simulatorId})`,
    );
    return {
      content: [{ type: 'text', text: successMessage }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullFailureMessage = `${failureMessagePrefix}: ${errorMessage}`;
    log(
      'error',
      `Error during ${operationLogContext} for simulator ${params.simulatorId}: ${errorMessage}`,
    );
    return {
      content: [{ type: 'text', text: fullFailureMessage }],
    };
  }
}

export async function reset_sim_locationLogic(
  params: ResetSimulatorLocationParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Resetting simulator ${params.simulatorId} location`);

  return executeSimctlCommandAndRespond(
    params,
    ['location', params.simulatorId, 'clear'],
    'Reset Simulator Location',
    `Successfully reset simulator ${params.simulatorId} location.`,
    'Failed to reset simulator location',
    'reset simulator location',
    executor,
  );
}

const publicSchemaObject = z.strictObject(
  resetSimulatorLocationSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'reset_sim_location',
  description: 'Reset sim location.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: resetSimulatorLocationSchema,
  }),
  annotations: {
    title: 'Reset Simulator Location',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<ResetSimulatorLocationParams>({
    internalSchema: resetSimulatorLocationSchema as unknown as z.ZodType<
      ResetSimulatorLocationParams,
      unknown
    >,
    logicFunction: reset_sim_locationLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
