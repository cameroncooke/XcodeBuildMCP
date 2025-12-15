/**
 * Logging Plugin: Start Simulator Log Capture
 *
 * Starts capturing logs from a specified simulator.
 */

import { z } from 'zod';
import { startLogCapture } from '../../../utils/log-capture/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.ts';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const startSimLogCapSchema = z.object({
  simulatorId: z
    .string()
    .uuid()
    .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
  bundleId: z.string().describe('Bundle identifier of the app to capture logs for.'),
  captureConsole: z
    .boolean()
    .optional()
    .describe('Whether to capture console output (requires app relaunch).'),
});

// Use z.infer for type safety
type StartSimLogCapParams = z.infer<typeof startSimLogCapSchema>;

export async function start_sim_log_capLogic(
  params: StartSimLogCapParams,
  _executor: CommandExecutor = getDefaultCommandExecutor(),
  logCaptureFunction: typeof startLogCapture = startLogCapture,
): Promise<ToolResponse> {
  const captureConsole = params.captureConsole ?? false;
  const { sessionId, error } = await logCaptureFunction(
    {
      simulatorUuid: params.simulatorId,
      bundleId: params.bundleId,
      captureConsole,
    },
    _executor,
  );
  if (error) {
    return {
      content: [createTextContent(`Error starting log capture: ${error}`)],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${captureConsole ? 'Note: Your app was relaunched to capture console output.' : 'Note: Only structured logs are being captured.'}\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
      ),
    ],
  };
}

const publicSchemaObject = startSimLogCapSchema.omit({ simulatorId: true } as const).strict();

export default {
  name: 'start_sim_log_cap',
  description:
    'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: startSimLogCapSchema,
  }),
  handler: createSessionAwareTool<StartSimLogCapParams>({
    internalSchema: startSimLogCapSchema as unknown as z.ZodType<StartSimLogCapParams>,
    logicFunction: start_sim_log_capLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
