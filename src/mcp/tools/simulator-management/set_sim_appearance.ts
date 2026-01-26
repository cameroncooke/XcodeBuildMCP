import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const setSimAppearanceSchema = z.object({
  simulatorId: z.uuid().describe('UUID of the simulator to use (obtained from list_simulators)'),
  mode: z.enum(['dark', 'light']).describe('dark|light'),
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

export async function set_sim_appearanceLogic(
  params: SetSimAppearanceParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Setting simulator ${params.simulatorId} appearance to ${params.mode} mode`);

  return executeSimctlCommandAndRespond(
    params,
    ['ui', params.simulatorId, 'appearance', params.mode],
    'Set Simulator Appearance',
    `Successfully set simulator ${params.simulatorId} appearance to ${params.mode} mode`,
    'Failed to set simulator appearance',
    'set simulator appearance',
    undefined,
    executor,
  );
}

const publicSchemaObject = z.strictObject(
  setSimAppearanceSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'set_sim_appearance',
  description: 'Set sim appearance.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: setSimAppearanceSchema,
  }),
  annotations: {
    title: 'Set Simulator Appearance',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<SetSimAppearanceParams>({
    internalSchema: setSimAppearanceSchema as unknown as z.ZodType<SetSimAppearanceParams, unknown>,
    logicFunction: set_sim_appearanceLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
