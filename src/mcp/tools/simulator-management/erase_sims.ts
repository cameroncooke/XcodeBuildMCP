import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

const eraseSimsBaseSchema = z.object({
  simulatorUuid: z.string().optional().describe('UUID of the simulator to erase.'),
  all: z.boolean().optional().describe('When true, erases all simulators.'),
  shutdownFirst: z
    .boolean()
    .optional()
    .describe('If true, shuts down the target (UDID or all) before erasing.'),
});

const eraseSimsSchema = eraseSimsBaseSchema.refine(
  (v) => {
    const selectors = (v.simulatorUuid ? 1 : 0) + (v.all === true ? 1 : 0);
    return selectors === 1;
  },
  { message: 'Provide exactly one of: simulatorUuid OR all=true.' },
);

type EraseSimsParams = z.infer<typeof eraseSimsSchema>;

export async function erase_simsLogic(
  params: EraseSimsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  try {
    if (params.simulatorUuid) {
      const udid = params.simulatorUuid;
      log(
        'info',
        `Erasing simulator ${udid}${params.shutdownFirst ? ' (shutdownFirst=true)' : ''}`,
      );

      if (params.shutdownFirst) {
        try {
          await executor(
            ['xcrun', 'simctl', 'shutdown', udid],
            'Shutdown Simulator',
            true,
            undefined,
          );
        } catch {
          // ignore shutdown errors; proceed to erase attempt
        }
      }

      const result = await executor(
        ['xcrun', 'simctl', 'erase', udid],
        'Erase Simulator',
        true,
        undefined,
      );
      if (result.success) {
        return { content: [{ type: 'text', text: `Successfully erased simulator ${udid}` }] };
      }

      // Add tool hint if simulator is booted and shutdownFirst was not requested
      const errText = result.error ?? 'Unknown error';
      if (/Unable to erase contents and settings.*Booted/i.test(errText) && !params.shutdownFirst) {
        return {
          content: [
            { type: 'text', text: `Failed to erase simulator: ${errText}` },
            {
              type: 'text',
              text: `Tool hint: The simulator appears to be Booted. Re-run erase_sims with { simulatorUuid: '${udid}', shutdownFirst: true } to shut it down before erasing.`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text', text: `Failed to erase simulator: ${errText}` }],
      };
    }

    if (params.all === true) {
      log('info', `Erasing ALL simulators${params.shutdownFirst ? ' (shutdownFirst=true)' : ''}`);
      if (params.shutdownFirst) {
        try {
          await executor(
            ['xcrun', 'simctl', 'shutdown', 'all'],
            'Shutdown All Simulators',
            true,
            undefined,
          );
        } catch {
          // ignore and continue to erase
        }
      }

      const result = await executor(
        ['xcrun', 'simctl', 'erase', 'all'],
        'Erase All Simulators',
        true,
        undefined,
      );
      if (!result.success) {
        const errText = result.error ?? 'Unknown error';
        const content = [{ type: 'text', text: `Failed to erase all simulators: ${errText}` }];
        if (
          /Unable to erase contents and settings.*Booted/i.test(errText) &&
          !params.shutdownFirst
        ) {
          content.push({
            type: 'text',
            text: 'Tool hint: One or more simulators appear to be Booted. Re-run erase_sims with { all: true, shutdownFirst: true } to shut them down before erasing.',
          });
        }
        return { content };
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
    'Erases simulator content and settings. Provide exactly one of: simulatorUuid or all=true. Optional: shutdownFirst to shut down before erasing.',
  schema: eraseSimsBaseSchema.shape,
  handler: createTypedTool(eraseSimsSchema, erase_simsLogic, getDefaultCommandExecutor),
};
