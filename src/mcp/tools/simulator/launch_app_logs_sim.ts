import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createTextContent } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { startLogCapture } from '../../../utils/log-capture/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

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
  simulatorId: z.string().describe('UUID of the simulator to use (obtained from list_sims)'),
  bundleId: z.string(),
  args: z.array(z.string()).optional(),
});

type LaunchAppLogsSimParams = z.infer<typeof launchAppLogsSimSchemaObject>;

const publicSchemaObject = z.strictObject(
  launchAppLogsSimSchemaObject.omit({
    simulatorId: true,
    bundleId: true,
  } as const).shape,
);

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
        `App launched successfully in simulator ${params.simulatorId} with log capture enabled.\n\nLog capture session ID: ${sessionId}\n\nInteract with your app in the simulator, then stop capture to retrieve logs.`,
      ),
    ],
    nextSteps: [
      {
        tool: 'stop_sim_log_cap',
        label: 'Stop capture and retrieve logs',
        params: { logSessionId: sessionId },
        priority: 1,
      },
    ],
    isError: false,
  };
}

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: launchAppLogsSimSchemaObject,
});

export const handler = createSessionAwareTool<LaunchAppLogsSimParams>({
  internalSchema: launchAppLogsSimSchemaObject as unknown as z.ZodType<
    LaunchAppLogsSimParams,
    unknown
  >,
  logicFunction: launch_app_logs_simLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { allOf: ['simulatorId', 'bundleId'], message: 'Provide simulatorId and bundleId' },
  ],
});
