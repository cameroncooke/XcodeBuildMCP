/**
 * Logging Plugin: Start Simulator Log Capture
 *
 * Starts capturing logs from a specified simulator.
 */

import { z } from 'zod';
import { startLogCapture } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { ToolResponse, createTextContent } from '../../types/common.js';

async function startSimLogCapToolHandler(
  params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
  },
  startLogCaptureFunction?: (params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
  }) => Promise<{
    sessionId: string;
    logFilePath: string;
    processes: any[];
    error?: string;
  }>,
): Promise<ToolResponse> {
  const validationResult = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!validationResult.isValid) {
    return validationResult.errorResponse!;
  }

  const logCaptureFunction = startLogCaptureFunction || startLogCapture;
  const { sessionId, error } = await logCaptureFunction(params);
  if (error) {
    return {
      content: [createTextContent(`Error starting log capture: ${error}`)],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${params.captureConsole ? 'Note: Your app was relaunched to capture console output.' : 'Note: Only structured logs are being captured.'}\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
      ),
    ],
  };
}

export default {
  name: 'start_sim_log_cap',
  description:
    'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
    bundleId: z.string().describe('Bundle identifier of the app to capture logs for.'),
    captureConsole: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to capture console output (requires app relaunch).'),
  },
  handler: startSimLogCapToolHandler,
};
