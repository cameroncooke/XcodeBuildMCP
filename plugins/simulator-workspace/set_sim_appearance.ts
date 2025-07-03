import { z } from 'zod';
import { log } from '../../src/utils/index.js';
import { validateRequiredParam } from '../../src/utils/index.js';
import { executeCommand } from '../../src/utils/index.js';

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
  name: 'set_sim_appearance',
  description: 'Sets the appearance mode (dark/light) of an iOS simulator.',
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
    mode: z.enum(['dark', 'light']).describe('The appearance mode to set (either "dark" or "light")'),
  },
  async handler(args: any) {
    const params = args;
    log('info', `Setting simulator ${params.simulatorUuid} appearance to ${params.mode} mode`);

    return executeSimctlCommandAndRespond(
      params,
      ['ui', params.simulatorUuid, 'appearance', params.mode],
      'Set Simulator Appearance',
      `Successfully set simulator ${params.simulatorUuid} appearance to ${params.mode} mode`,
      'Failed to set simulator appearance',
      'set simulator appearance',
    );
  },
};