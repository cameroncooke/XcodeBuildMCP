/**
 * Logging Plugin: Stop Simulator Log Capture
 *
 * Stops an active simulator log capture session and returns the captured logs.
 */

import { z } from 'zod';
import { stopLogCapture as _stopLogCapture } from '../../../utils/log-capture/index.js';
import { ToolResponse, createTextContent } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { getDefaultCommandExecutor } from '../../../utils/command.js';

// Define schema as ZodObject
const stopSimLogCapSchema = z.object({
  logSessionId: z.string().describe('The session ID returned by start_sim_log_cap.'),
});

// Use z.infer for type safety
type StopSimLogCapParams = z.infer<typeof stopSimLogCapSchema>;

/**
 * Business logic for stopping simulator log capture session
 */
export async function stop_sim_log_capLogic(params: StopSimLogCapParams): Promise<ToolResponse> {
  const { logContent, error } = await _stopLogCapture(params.logSessionId);
  if (error) {
    return {
      content: [
        createTextContent(`Error stopping log capture session ${params.logSessionId}: ${error}`),
      ],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture session ${params.logSessionId} stopped successfully. Log content follows:\n\n${logContent}`,
      ),
    ],
  };
}

export default {
  name: 'stop_sim_log_cap',
  description: 'Stops an active simulator log capture session and returns the captured logs.',
  schema: stopSimLogCapSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(stopSimLogCapSchema, stop_sim_log_capLogic, getDefaultCommandExecutor),
};
