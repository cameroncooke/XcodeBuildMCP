import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const eraseSimsBaseSchema = z
  .object({
    simulatorId: z.uuid().describe('UDID of the simulator to erase.'),
    shutdownFirst: z.boolean().optional(),
  })
  .passthrough();

const eraseSimsSchema = eraseSimsBaseSchema;

type EraseSimsParams = z.infer<typeof eraseSimsSchema>;

export async function erase_simsLogic(
  params: EraseSimsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  try {
    const simulatorId = params.simulatorId;
    log(
      'info',
      `Erasing simulator ${simulatorId}${params.shutdownFirst ? ' (shutdownFirst=true)' : ''}`,
    );

    if (params.shutdownFirst) {
      try {
        await executor(
          ['xcrun', 'simctl', 'shutdown', simulatorId],
          'Shutdown Simulator',
          true,
          undefined,
        );
      } catch {
        // ignore shutdown errors; proceed to erase attempt
      }
    }

    const result = await executor(
      ['xcrun', 'simctl', 'erase', simulatorId],
      'Erase Simulator',
      true,
      undefined,
    );
    if (result.success) {
      return {
        content: [{ type: 'text', text: `Successfully erased simulator ${simulatorId}` }],
      };
    }

    // Add tool hint if simulator is booted and shutdownFirst was not requested
    const errText = result.error ?? 'Unknown error';
    if (/Unable to erase contents and settings.*Booted/i.test(errText) && !params.shutdownFirst) {
      return {
        content: [
          { type: 'text', text: `Failed to erase simulator: ${errText}` },
          {
            type: 'text',
            text: `Tool hint: The simulator appears to be Booted. Re-run erase_sims with { simulatorId: '${simulatorId}', shutdownFirst: true } to shut it down before erasing.`,
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: `Failed to erase simulator: ${errText}` }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Error erasing simulators: ${message}`);
    return { content: [{ type: 'text', text: `Failed to erase simulators: ${message}` }] };
  }
}

const publicSchemaObject = eraseSimsSchema.omit({ simulatorId: true } as const).passthrough();

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: eraseSimsSchema,
});

export const handler = createSessionAwareTool<EraseSimsParams>({
  internalSchema: eraseSimsSchema as unknown as z.ZodType<EraseSimsParams>,
  logicFunction: erase_simsLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
});
