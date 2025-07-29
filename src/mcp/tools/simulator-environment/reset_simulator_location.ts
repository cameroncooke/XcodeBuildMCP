import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';

interface ResetSimulatorLocationParams {
  simulatorUuid: string;
}

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: Record<string, unknown>,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  executor: CommandExecutor,
  extraValidation?: () => ToolResponse | undefined,
): Promise<ToolResponse> {
  const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simulatorUuidValidation.isValid) {
    return simulatorUuidValidation.errorResponse!;
  }

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

export async function reset_simulator_locationLogic(
  params: ResetSimulatorLocationParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Resetting simulator ${params.simulatorUuid} location`);

  return executeSimctlCommandAndRespond(
    params as unknown as Record<string, unknown>,
    ['location', params.simulatorUuid, 'clear'],
    'Reset Simulator Location',
    `Successfully reset simulator ${params.simulatorUuid} location.`,
    'Failed to reset simulator location',
    'reset simulator location',
    executor,
  );
}

export default {
  name: 'reset_simulator_location',
  description: "Resets the simulator's location to default.",
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return reset_simulator_locationLogic(
      args as unknown as ResetSimulatorLocationParams,
      getDefaultCommandExecutor(),
    );
  },
};
