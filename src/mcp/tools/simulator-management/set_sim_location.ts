import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const setSimulatorLocationSchema = z.object({
  simulatorId: z.uuid().describe('UUID of the simulator to use (obtained from list_simulators)'),
  latitude: z.number(),
  longitude: z.number(),
});

// Use z.infer for type safety
type SetSimulatorLocationParams = z.infer<typeof setSimulatorLocationSchema>;

// Helper function to execute simctl commands and handle responses
async function executeSimctlCommandAndRespond(
  params: SetSimulatorLocationParams,
  simctlSubCommand: string[],
  operationDescriptionForXcodeCommand: string,
  successMessage: string,
  failureMessagePrefix: string,
  operationLogContext: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  extraValidation?: () => ToolResponse | null,
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

export async function set_sim_locationLogic(
  params: SetSimulatorLocationParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const extraValidation = (): ToolResponse | null => {
    if (params.latitude < -90 || params.latitude > 90) {
      return {
        content: [
          {
            type: 'text',
            text: 'Latitude must be between -90 and 90 degrees',
          },
        ],
      };
    }
    if (params.longitude < -180 || params.longitude > 180) {
      return {
        content: [
          {
            type: 'text',
            text: 'Longitude must be between -180 and 180 degrees',
          },
        ],
      };
    }
    return null;
  };

  log(
    'info',
    `Setting simulator ${params.simulatorId} location to ${params.latitude},${params.longitude}`,
  );

  return executeSimctlCommandAndRespond(
    params,
    ['location', params.simulatorId, 'set', `${params.latitude},${params.longitude}`],
    'Set Simulator Location',
    `Successfully set simulator ${params.simulatorId} location to ${params.latitude},${params.longitude}`,
    'Failed to set simulator location',
    'set simulator location',
    executor,
    extraValidation,
  );
}

const publicSchemaObject = z.strictObject(
  setSimulatorLocationSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'set_sim_location',
  description: 'Set sim location.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: setSimulatorLocationSchema,
  }),
  annotations: {
    title: 'Set Simulator Location',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<SetSimulatorLocationParams>({
    internalSchema: setSimulatorLocationSchema as unknown as z.ZodType<
      SetSimulatorLocationParams,
      unknown
    >,
    logicFunction: set_sim_locationLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
