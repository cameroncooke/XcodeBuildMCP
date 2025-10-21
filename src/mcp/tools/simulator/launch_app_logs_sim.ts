import { z } from 'zod';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { startLogCapture } from '../../../utils/log-capture/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

export type LogCaptureFunction = (
  params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
    args?: string[];
  },
  executor: CommandExecutor,
) => Promise<{ sessionId: string; logFilePath: string; processes: unknown[]; error?: string }>;

const launchAppLogsSimSchemaObject = z.object({
  simulatorId: z.string().describe('UUID of the simulator to target'),
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

type LaunchAppLogsSimParams = z.infer<typeof launchAppLogsSimSchemaObject>;

const publicSchemaObject = launchAppLogsSimSchemaObject.omit({
  simulatorId: true,
} as const);

export async function launch_app_logs_simLogic(
  params: LaunchAppLogsSimParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  logCaptureFunction: LogCaptureFunction = startLogCapture,
): Promise<ToolResponse> {
  log('info', `Starting app launch with logs for simulator ${params.simulatorId}`);

  const captureParams = {
    simulatorUuid: params.simulatorId,
    bundleId: params.bundleId,
    captureConsole: true,
    ...(params.args && params.args.length > 0 ? { args: params.args } : {}),
  } as const;

  const { sessionId, error } = await logCaptureFunction(captureParams, executor);
  if (error) {
    return {
      content: [createTextContent(`App was launched but log capture failed: ${error}`)],
      isError: true,
    };
  }

  return {
    content: [
      createTextContent(
        `App launched successfully in simulator ${params.simulatorId} with log capture enabled.\n\nLog capture session ID: ${sessionId}\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "${sessionId}" })' to stop capture and retrieve logs.`,
      ),
    ],
    isError: false,
  };
}

export default {
  name: 'launch_app_logs_sim',
  description: 'Launches an app in an iOS simulator and captures its logs.',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<LaunchAppLogsSimParams>({
    internalSchema: launchAppLogsSimSchemaObject,
    logicFunction: launch_app_logs_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
