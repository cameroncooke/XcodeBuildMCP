import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const baseSchemaObject = z.object({
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator to use (obtained from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
  bundleId: z.string(),
});

const stopAppSimSchema = z.preprocess(
  nullifyEmptyStrings,
  baseSchemaObject
    .refine((val) => val.simulatorId !== undefined || val.simulatorName !== undefined, {
      message: 'Either simulatorId or simulatorName is required.',
    })
    .refine((val) => !(val.simulatorId !== undefined && val.simulatorName !== undefined), {
      message: 'simulatorId and simulatorName are mutually exclusive. Provide only one.',
    }),
);

export type StopAppSimParams = z.infer<typeof stopAppSimSchema>;

export async function stop_app_simLogic(
  params: StopAppSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  let simulatorId = params.simulatorId;
  let simulatorDisplayName = simulatorId ?? '';

  if (params.simulatorName && !simulatorId) {
    log('info', `Looking up simulator by name: ${params.simulatorName}`);

    const simulatorListResult = await executor(
      ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
      'List Simulators',
      true,
    );
    if (!simulatorListResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list simulators: ${simulatorListResult.error}`,
          },
        ],
        isError: true,
      };
    }

    const simulatorsData = JSON.parse(simulatorListResult.output) as {
      devices: Record<string, Array<{ udid: string; name: string }>>;
    };

    let foundSimulator: { udid: string; name: string } | null = null;
    for (const runtime in simulatorsData.devices) {
      const devices = simulatorsData.devices[runtime];
      const simulator = devices.find((device) => device.name === params.simulatorName);
      if (simulator) {
        foundSimulator = simulator;
        break;
      }
    }

    if (!foundSimulator) {
      return {
        content: [
          {
            type: 'text',
            text: `Simulator named "${params.simulatorName}" not found. Use list_sims to see available simulators.`,
          },
        ],
        isError: true,
      };
    }

    simulatorId = foundSimulator.udid;
    simulatorDisplayName = `"${params.simulatorName}" (${foundSimulator.udid})`;
  }

  if (!simulatorId) {
    return {
      content: [
        {
          type: 'text',
          text: 'No simulator identifier provided',
        },
      ],
      isError: true,
    };
  }

  log('info', `Stopping app ${params.bundleId} in simulator ${simulatorId}`);

  try {
    const command = ['xcrun', 'simctl', 'terminate', simulatorId, params.bundleId];
    const result = await executor(command, 'Stop App in Simulator', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Stop app in simulator operation failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ App ${params.bundleId} stopped successfully in simulator ${simulatorDisplayName || simulatorId}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error stopping app in simulator: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Stop app in simulator operation failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

const publicSchemaObject = z.strictObject(
  baseSchemaObject.omit({
    simulatorId: true,
    simulatorName: true,
    bundleId: true,
  } as const).shape,
);

export default {
  name: 'stop_app_sim',
  description: 'Stop sim app.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: baseSchemaObject,
  }),
  annotations: {
    title: 'Stop App Simulator',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<StopAppSimParams>({
    internalSchema: stopAppSimSchema as unknown as z.ZodType<StopAppSimParams, unknown>,
    logicFunction: stop_app_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
      { allOf: ['bundleId'], message: 'bundleId is required' },
    ],
    exclusivePairs: [['simulatorId', 'simulatorName']],
  }),
};
