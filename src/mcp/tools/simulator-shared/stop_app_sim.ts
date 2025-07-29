import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import {
  log,
  validateRequiredParam,
  CommandExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/index.js';

export interface StopAppSimParams {
  simulatorUuid: string;
  bundleId: string;
}

export async function stop_app_simLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simulatorUuidValidation.isValid) {
    return simulatorUuidValidation.errorResponse!;
  }

  const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
  if (!bundleIdValidation.isValid) {
    return bundleIdValidation.errorResponse!;
  }

  log('info', `Stopping app ${params.bundleId} in simulator ${params.simulatorUuid}`);

  try {
    const command = [
      'xcrun',
      'simctl',
      'terminate',
      params.simulatorUuid as string,
      params.bundleId as string,
    ];
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
          text: `✅ App ${params.bundleId} stopped successfully in simulator ${params.simulatorUuid}`,
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

export default {
  name: 'stop_app_sim',
  description: 'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
  schema: {
    simulatorUuid: z.string().describe('UUID of the simulator (obtained from list_simulators)'),
    bundleId: z
      .string()
      .describe("Bundle identifier of the app to stop (e.g., 'com.example.MyApp')"),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return stop_app_simLogic(args, getDefaultCommandExecutor());
  },
};
