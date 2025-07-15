import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { executeCommand, CommandExecutor } from '../../utils/index.js';

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: Record<string, unknown>,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  extraValidation?: Record<string, unknown>,
  executor: CommandExecutor = executeCommand,
): Promise<ToolResponse> {
  const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
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
    const result = await executeCommand(
      command,
      operationDescriptionForXcodeCommand,
      true,
      undefined,
      executor,
    );

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
  description:
    'Simulates different network conditions (e.g., wifi, 3g, edge, high-latency, dsl, 100%loss, 3g-lossy, very-lossy) in the simulator.',
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
  async handler(args: Record<string, unknown>, executor?: CommandExecutor): Promise<ToolResponse> {
    const params = args;
    log('info', `Setting simulator ${params.simulatorUuid} network condition to ${params.profile}`);

    return executeSimctlCommandAndRespond(
      params,
      ['status_bar', params.simulatorUuid, 'override', '--dataNetwork', params.profile],
      'Set Network Condition',
      `Successfully set simulator ${params.simulatorUuid} network condition to ${params.profile} profile`,
      'Failed to set network condition',
      'set network condition',
      undefined,
      executor,
    );
  },
};
