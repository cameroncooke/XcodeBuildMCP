import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const resetSimulatorLocationSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
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
    const result = await executor(command, operationDescriptionForXcodeCommand, true, {});

    if (!result.success) {
      const fullFailureMessage = `${failureMessagePrefix}: ${result.error}`;
      log(
        'error',
        `${fullFailureMessage} (operation: ${operationLogContext}, simulator: ${params.simulatorUuid})`,
      );
      return {
        content: [{ type: 'text', text: fullFailureMessage }],
      };
    }

    log(
      'info',
      `${successMessage} (operation: ${operationLogContext}, simulator: ${params.simulatorUuid})`,
    );
    return {
      content: [{ type: 'text', text: successMessage }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullFailureMessage = `${failureMessagePrefix}: ${errorMessage}`;
    log(
      'error',
      `Error during ${operationLogContext} for simulator ${params.simulatorUuid}: ${errorMessage}`,
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
  log('info', `Resetting simulator ${params.simulatorUuid} location`);

  return executeSimctlCommandAndRespond(
    params,
    ['location', params.simulatorUuid, 'clear'],
    'Reset Simulator Location',
    `Successfully reset simulator ${params.simulatorUuid} location.`,
    'Failed to reset simulator location',
    'reset simulator location',
    executor,
  );
}

export default {
  name: 'reset_sim_location',
  description: "Resets the simulator's location to default.",
  schema: resetSimulatorLocationSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    resetSimulatorLocationSchema,
    reset_sim_locationLogic,
    getDefaultCommandExecutor,
  ),
};
