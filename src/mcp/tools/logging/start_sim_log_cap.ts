/**
 * Logging Plugin: Start Simulator Log Capture
 *
 * Starts capturing logs from a specified simulator.
 */

import { z } from 'zod';
import { startLogCapture } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { ToolResponse, createTextContent } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const startSimLogCapSchema = z.object({
  simulatorUuid: z
    .string()
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
  const paramsWithDefaults = {
    ...params,
    captureConsole: params.captureConsole ?? false,
  };
  const { sessionId, error } = await logCaptureFunction(paramsWithDefaults, _executor);
  if (error) {
    return {
      content: [createTextContent(`Error starting log capture: ${error}`)],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${paramsWithDefaults.captureConsole ? 'Note: Your app was relaunched to capture console output.' : 'Note: Only structured logs are being captured.'}\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
      ),
    ],
  };
}

export default {
  name: 'start_sim_log_cap',
  description:
    'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
  schema: startSimLogCapSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(startSimLogCapSchema, start_sim_log_capLogic, getDefaultCommandExecutor),
};
