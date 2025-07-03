import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { validateRequiredParam } from '../../src/utils/validation.js';
import { executeCommand } from '../../src/utils/command.js';

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params,
  simctlSubCommand,
  operationDescriptionForXcodeCommand,
  successMessage,
  failureMessagePrefix,
  operationLogContext,
  extraValidation,
) {
  const simulatorUuidValidation = validateRequiredParam(
    'simulatorUuid',
    params.simulatorUuid,
  );
  if (!simulatorUuidValidation.isValid) {
    return simulatorUuidValidation.errorResponse;
  }

  if (extraValidation) {
    const validationResult = extraValidation();
    if (validationResult) {
      return validationResult;
    }
  }

  try {
    const command = ['xcrun', 'simctl', ...simctlSubCommand];
    const result = await executeCommand(command, operationDescriptionForXcodeCommand);

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

export default {
  name: 'reset_simulator_location',
  description: "Resets the simulator's location to default.",
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
  },
  async handler(params) {
    log('info', `Resetting simulator ${params.simulatorUuid} location`);

    return executeSimctlCommandAndRespond(
      params,
      ['location', params.simulatorUuid, 'clear'],
      'Reset Simulator Location',
      `Successfully reset simulator ${params.simulatorUuid} location.`,
      'Failed to reset simulator location',
      'reset simulator location',
    );
  },
};