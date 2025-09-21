import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

const eraseSimsBaseSchema = z.object({
  simulatorUuid: z.string().optional().describe('UUID of the simulator to erase.'),
  all: z.boolean().optional().describe('When true, erases all simulators.'),
});

const eraseSimsSchema = eraseSimsBaseSchema.refine(
  (v) => {
    const selectors = (v.simulatorUuid ? 1 : 0) + (v.all === true ? 1 : 0);
    return selectors === 1;
  },
  { message: 'Provide exactly one of: simulatorUuid OR all=true.' },
);

type EraseSimsParams = z.infer<typeof eraseSimsSchema>;

async function eraseSingle(udid: string, executor: CommandExecutor): Promise<ToolResponse> {
  const result = await executor(
    ['xcrun', 'simctl', 'erase', udid],
    'Erase Simulator',
    true,
    undefined,
  );
  if (result.success) {
    return { content: [{ type: 'text', text: `Successfully erased simulator ${udid}` }] };
  }
  return {
    content: [
      { type: 'text', text: `Failed to erase simulator: ${result.error ?? 'Unknown error'}` },
    ],
  };
}

export async function erase_simsLogic(
  params: EraseSimsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  try {
    if (params.simulatorUuid) {
      log('info', `Erasing simulator ${params.simulatorUuid}`);
      return await eraseSingle(params.simulatorUuid, executor);
    }

    if (params.all === true) {
      log('info', 'Erasing ALL simulators');
      const result = await executor(
        ['xcrun', 'simctl', 'erase', 'all'],
        'Erase All Simulators',
        true,
        undefined,
      );
      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to erase all simulators: ${result.error ?? 'Unknown error'}`,
            },
          ],
        };
      }
      return { content: [{ type: 'text', text: 'Successfully erased all simulators' }] };
    }

    return {
      content: [{ type: 'text', text: 'Invalid parameters: provide simulatorUuid or all=true.' }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Error erasing simulators: ${message}`);
    return { content: [{ type: 'text', text: `Failed to erase simulators: ${message}` }] };
  }
}

export default {
  name: 'erase_sims',
  description:
    'Erases simulator content and settings. Provide exactly one of: simulatorUuid or all=true.',
  schema: eraseSimsBaseSchema.shape,
  handler: createTypedTool(eraseSimsSchema, erase_simsLogic, getDefaultCommandExecutor),
};
