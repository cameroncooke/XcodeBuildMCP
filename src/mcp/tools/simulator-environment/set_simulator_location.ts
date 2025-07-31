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
const setSimulatorLocationSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
  latitude: z.number().describe('The latitude for the custom location.'),
  longitude: z.number().describe('The longitude for the custom location.'),
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

export async function set_simulator_locationLogic(
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
    `Setting simulator ${params.simulatorUuid} location to ${params.latitude},${params.longitude}`,
  );

  return executeSimctlCommandAndRespond(
    params,
    ['location', params.simulatorUuid, 'set', `${params.latitude},${params.longitude}`],
    'Set Simulator Location',
    `Successfully set simulator ${params.simulatorUuid} location to ${params.latitude},${params.longitude}`,
    'Failed to set simulator location',
    'set simulator location',
    executor,
    extraValidation,
  );
}

export default {
  name: 'set_simulator_location',
  description: 'Sets a custom GPS location for the simulator.',
  schema: setSimulatorLocationSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    setSimulatorLocationSchema,
    set_simulator_locationLogic,
    getDefaultCommandExecutor,
  ),
};
