import { z } from 'zod';
import { ToolResponse, createTextContent } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { validateRequiredParam } from '../../../utils/index.js';
import { startLogCapture } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

/**
 * Log capture function type for dependency injection
 */
export type LogCaptureFunction = (
  params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
  },
  executor: CommandExecutor,
) => Promise<{ sessionId: string; logFilePath: string; processes: unknown[]; error?: string }>;

// Define schema as ZodObject
const launchAppLogsSimSchema = z.object({
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to use (obtained from list_simulators)'),
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

// Use z.infer for type safety
type LaunchAppLogsSimParams = z.infer<typeof launchAppLogsSimSchema>;

/**
 * Business logic for launching app with logs in simulator
 */
export async function launch_app_logs_simLogic(
  params: LaunchAppLogsSimParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  logCaptureFunction: LogCaptureFunction = startLogCapture,
): Promise<ToolResponse> {
  const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!simulatorUuidValidation.isValid) {
    return simulatorUuidValidation.errorResponse!;
  }

  const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
  if (!bundleIdValidation.isValid) {
    return bundleIdValidation.errorResponse!;
  }

  log('info', `Starting app launch with logs for simulator ${params.simulatorUuid}`);

  // Start log capture session
  const { sessionId, error } = await logCaptureFunction(
    {
      simulatorUuid: params.simulatorUuid,
      bundleId: params.bundleId,
      captureConsole: true,
    },
    executor,
  );
  if (error) {
    return {
      content: [createTextContent(`App was launched but log capture failed: ${error}`)],
      isError: true,
    };
  }

  return {
    content: [
      createTextContent(
        `App launched successfully in simulator ${params.simulatorUuid} with log capture enabled.\n\nLog capture session ID: ${sessionId}\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "${sessionId}" })' to stop capture and retrieve logs.`,
      ),
    ],
    isError: false,
  };
}

export default {
  name: 'launch_app_logs_sim',
  description: 'Launches an app in an iOS simulator and captures its logs.',
  schema: launchAppLogsSimSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    launchAppLogsSimSchema,
    launch_app_logs_simLogic,
    getDefaultCommandExecutor,
  ),
};
