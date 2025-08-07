import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const simStatusbarSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
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
    `Setting simulator ${params.simulatorUuid} status bar data network to ${params.dataNetwork}`,
  );

  try {
    let command: string[];
    let successMessage: string;

    if (params.dataNetwork === 'clear') {
      command = ['xcrun', 'simctl', 'status_bar', params.simulatorUuid, 'clear'];
      successMessage = `Successfully cleared status bar overrides for simulator ${params.simulatorUuid}`;
    } else {
      command = [
        'xcrun',
        'simctl',
        'status_bar',
        params.simulatorUuid,
        'override',
        '--dataNetwork',
        params.dataNetwork,
      ];
      successMessage = `Successfully set simulator ${params.simulatorUuid} status bar data network to ${params.dataNetwork}`;
    }

    const result = await executor(command, 'Set Status Bar', true, undefined);

    if (!result.success) {
      const failureMessage = `Failed to set status bar: ${result.error}`;
      log('error', `${failureMessage} (simulator: ${params.simulatorUuid})`);
      return {
        content: [{ type: 'text', text: failureMessage }],
        isError: true,
      };
    }

    log('info', `${successMessage} (simulator: ${params.simulatorUuid})`);
    return {
      content: [{ type: 'text', text: successMessage }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureMessage = `Failed to set status bar: ${errorMessage}`;
    log('error', `Error setting status bar for simulator ${params.simulatorUuid}: ${errorMessage}`);
    return {
      content: [{ type: 'text', text: failureMessage }],
      isError: true,
    };
  }
}

export default {
  name: 'sim_statusbar',
  description:
    'Sets the data network indicator in the iOS simulator status bar. Use "clear" to reset all overrides, or specify a network type (hide, wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc).',
  schema: simStatusbarSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(simStatusbarSchema, sim_statusbarLogic, getDefaultCommandExecutor),
};
