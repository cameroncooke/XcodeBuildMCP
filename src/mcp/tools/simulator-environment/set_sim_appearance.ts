import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import {
  log,
  validateRequiredParam,
  CommandExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const setSimAppearanceSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
  mode: z.enum(['dark', 'light']).describe('The appearance mode to set (either "dark" or "light")'),
});

// Use z.infer for type safety
type SetSimAppearanceParams = z.infer<typeof setSimAppearanceSchema>;

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: SetSimAppearanceParams,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  extraValidation?: () => ToolResponse | undefined,
  executor: CommandExecutor = getDefaultCommandExecutor(),
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

export async function set_sim_appearanceLogic(
  params: SetSimAppearanceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Setting simulator ${params.simulatorUuid} appearance to ${params.mode} mode`);

  return executeSimctlCommandAndRespond(
    params,
    ['ui', params.simulatorUuid, 'appearance', params.mode],
    'Set Simulator Appearance',
    `Successfully set simulator ${params.simulatorUuid} appearance to ${params.mode} mode`,
    'Failed to set simulator appearance',
    'set simulator appearance',
    undefined,
    executor,
  );
}

export default {
  name: 'set_sim_appearance',
  description: 'Sets the appearance mode (dark/light) of an iOS simulator.',
  schema: setSimAppearanceSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    setSimAppearanceSchema,
    set_sim_appearanceLogic,
    getDefaultCommandExecutor,
  ),
};
