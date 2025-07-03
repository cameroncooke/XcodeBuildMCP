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
  name: 'set_network_condition',
  description: 'Simulates different network conditions (e.g., wifi, 3g, edge, high-latency, dsl, 100%loss, 3g-lossy, very-lossy) in the simulator.',
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
    profile: z
      .enum(['wifi', '3g', 'edge', 'high-latency', 'dsl', '100%loss', '3g-lossy', 'very-lossy'])
      .describe(
        'The network profile to simulate. Must be one of: wifi, 3g, edge, high-latency, dsl, 100%loss, 3g-lossy, very-lossy.',
      ),
  },
  async handler(params) {
    log('info', `Setting simulator ${params.simulatorUuid} network condition to ${params.profile}`);

    return executeSimctlCommandAndRespond(
      params,
      ['status_bar', params.simulatorUuid, 'override', '--dataNetwork', params.profile],
      'Set Network Condition',
      `Successfully set simulator ${params.simulatorUuid} network condition to ${params.profile} profile`,
      'Failed to set network condition',
      'set network condition',
    );
  },
};