import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const simStatusbarSchema = z.object({
  simulatorId: z.uuid().describe('UUID of the simulator to use (obtained from list_simulators)'),
  dataNetwork: z
    .enum([
      'clear',
      'hide',
      'wifi',
      '3g',
      '4g',
      'lte',
      'lte-a',
      'lte+',
      '5g',
      '5g+',
      '5g-uwb',
      '5g-uc',
    ])
    .describe(
      'Data network type to display in status bar. Use "clear" to reset all overrides. Valid values: clear, hide, wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc.',
    ),
});

// Use z.infer for type safety
type SimStatusbarParams = z.infer<typeof simStatusbarSchema>;

export async function sim_statusbarLogic(
  params: SimStatusbarParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log(
    'info',
    `Setting simulator ${params.simulatorId} status bar data network to ${params.dataNetwork}`,
  );

  try {
    let command: string[];
    let successMessage: string;

    if (params.dataNetwork === 'clear') {
      command = ['xcrun', 'simctl', 'status_bar', params.simulatorId, 'clear'];
      successMessage = `Successfully cleared status bar overrides for simulator ${params.simulatorId}`;
    } else {
      command = [
        'xcrun',
        'simctl',
        'status_bar',
        params.simulatorId,
        'override',
        '--dataNetwork',
        params.dataNetwork,
      ];
      successMessage = `Successfully set simulator ${params.simulatorId} status bar data network to ${params.dataNetwork}`;
    }

    const result = await executor(command, 'Set Status Bar', true, undefined);

    if (!result.success) {
      const failureMessage = `Failed to set status bar: ${result.error}`;
      log('error', `${failureMessage} (simulator: ${params.simulatorId})`);
      return {
        content: [{ type: 'text', text: failureMessage }],
        isError: true,
      };
    }

    log('info', `${successMessage} (simulator: ${params.simulatorId})`);
    return {
      content: [{ type: 'text', text: successMessage }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureMessage = `Failed to set status bar: ${errorMessage}`;
    log('error', `Error setting status bar for simulator ${params.simulatorId}: ${errorMessage}`);
    return {
      content: [{ type: 'text', text: failureMessage }],
      isError: true,
    };
  }
}

const publicSchemaObject = z.strictObject(
  simStatusbarSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'sim_statusbar',
  description:
    'Sets the data network indicator in the iOS simulator status bar. Use "clear" to reset all overrides, or specify a network type (hide, wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc).',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: simStatusbarSchema,
  }), // MCP SDK compatibility
  annotations: {
    title: 'Simulator Statusbar',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<SimStatusbarParams>({
    internalSchema: simStatusbarSchema as unknown as z.ZodType<SimStatusbarParams, unknown>,
    logicFunction: sim_statusbarLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
