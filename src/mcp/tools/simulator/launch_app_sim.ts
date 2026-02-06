import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
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
  bundleId: z.string().describe('Bundle identifier of the app to launch'),
  args: z.array(z.string()).optional().describe('Optional arguments to pass to the app'),
});

// Internal schema requires simulatorId (factory resolves simulatorName → simulatorId)
const internalSchemaObject = z.object({
  simulatorId: z.string(),
  simulatorName: z.string().optional(),
  bundleId: z.string(),
  args: z.array(z.string()).optional(),
});

export type LaunchAppSimParams = z.infer<typeof internalSchemaObject>;

export async function launch_app_simLogic(
  params: LaunchAppSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const simulatorId = params.simulatorId;
  const simulatorDisplayName = params.simulatorName
    ? `"${params.simulatorName}" (${simulatorId})`
    : simulatorId;

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
      false,
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

    const result = await executor(command, 'Launch App in Simulator', false, undefined);

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

    return {
      content: [
        {
          type: 'text',
          text: `App launched successfully in simulator ${simulatorDisplayName}.`,
        },
      ],
      nextSteps: [
        {
          tool: 'open_sim',
          label: 'Open Simulator app to see it',
          params: {},
          priority: 1,
        },
        {
          tool: 'start_sim_log_cap',
          label: 'Capture structured logs (app continues running)',
          params: { simulatorId, bundleId: params.bundleId },
          priority: 2,
        },
        {
          tool: 'start_sim_log_cap',
          label: 'Capture console + structured logs (app restarts)',
          params: { simulatorId, bundleId: params.bundleId, captureConsole: true },
          priority: 3,
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

const publicSchemaObject = z.strictObject(
  baseSchemaObject.omit({
    simulatorId: true,
    simulatorName: true,
    bundleId: true,
  } as const).shape,
);

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: baseSchemaObject,
});

export const handler = createSessionAwareTool<LaunchAppSimParams>({
  internalSchema: internalSchemaObject as unknown as z.ZodType<LaunchAppSimParams, unknown>,
  logicFunction: launch_app_simLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    { allOf: ['bundleId'], message: 'bundleId is required' },
  ],
  exclusivePairs: [['simulatorId', 'simulatorName']],
});
