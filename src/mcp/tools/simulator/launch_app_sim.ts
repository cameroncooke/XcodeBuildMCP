import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

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
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const launchAppSimSchema = baseSchema
  .refine((val) => val.simulatorId !== undefined || val.simulatorName !== undefined, {
    message: 'Either simulatorId or simulatorName is required.',
  })
  .refine((val) => !(val.simulatorId !== undefined && val.simulatorName !== undefined), {
    message: 'simulatorId and simulatorName are mutually exclusive. Provide only one.',
  });

export type LaunchAppSimParams = z.infer<typeof launchAppSimSchema>;

export async function launch_app_simLogic(
  params: LaunchAppSimParams,
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

  log('info', `Starting xcrun simctl launch request for simulator ${simulatorId}`);

  try {
    const getAppContainerCmd = [
      'xcrun',
      'simctl',
      'get_app_container',
      simulatorId,
      params.bundleId,
      'app',
    ];
    const getAppContainerResult = await executor(
      getAppContainerCmd,
      'Check App Installed',
      true,
      undefined,
    );
    if (!getAppContainerResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `App is not installed on the simulator. Please use install_app_sim before launching.\n\nWorkflow: build → install → launch.`,
          },
        ],
        isError: true,
      };
    }
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: `App is not installed on the simulator (check failed). Please use install_app_sim before launching.\n\nWorkflow: build → install → launch.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const command = ['xcrun', 'simctl', 'launch', simulatorId, params.bundleId];
    if (params.args && params.args.length > 0) {
      command.push(...params.args);
    }

    const result = await executor(command, 'Launch App in Simulator', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Launch app in simulator operation failed: ${result.error}`,
          },
        ],
      };
    }

    const userParamName = params.simulatorId ? 'simulatorId' : 'simulatorName';
    const userParamValue = params.simulatorId ?? params.simulatorName ?? simulatorId;

    return {
      content: [
        {
          type: 'text',
          text: `✅ App launched successfully in simulator ${simulatorDisplayName || simulatorId}.\n\nNext Steps:\n1. To see simulator: open_sim()\n2. Log capture: start_sim_log_cap({ ${userParamName}: "${userParamValue}", bundleId: "${params.bundleId}" })\n   With console: start_sim_log_cap({ ${userParamName}: "${userParamValue}", bundleId: "${params.bundleId}", captureConsole: true })\n3. Stop logs: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during launch app in simulator operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Launch app in simulator operation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

const publicSchemaObject = baseSchemaObject
  .omit({
    simulatorId: true,
    simulatorName: true,
  } as const)
  .strict();

export default {
  name: 'launch_app_sim',
  description: 'Launches an app in an iOS simulator.',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<LaunchAppSimParams>({
    internalSchema: launchAppSimSchema as unknown as z.ZodType<LaunchAppSimParams>,
    logicFunction: launch_app_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
    exclusivePairs: [['simulatorId', 'simulatorName']],
  }),
};
