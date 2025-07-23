import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import {
  log,
  validateRequiredParam,
  CommandExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/index.js';

interface SetNetworkConditionParams {
  simulatorUuid: string;
  profile: 'wifi' | '3g' | 'edge' | 'high-latency' | 'dsl' | '100%loss' | '3g-lossy' | 'very-lossy';
}

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: Record<string, unknown>,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  extraValidation?: Record<string, unknown>,
  executor: CommandExecutor = getDefaultCommandExecutor(),
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
    const result = await executor(command, operationDescriptionForXcodeCommand, true, undefined);

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

export async function set_network_conditionLogic(
  params: SetNetworkConditionParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
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
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return set_network_conditionLogic(
      args as SetNetworkConditionParams,
      getDefaultCommandExecutor(),
    );
  },
};
